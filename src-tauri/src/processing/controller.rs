use crate::processing::worker::{Worker, WorkerResult};
use crate::types::*;
use std::sync::atomic::{AtomicBool, Ordering, AtomicU64, AtomicUsize};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager, Window};
use std::collections::HashSet;
use tokio::sync::Semaphore;
use std::time::Instant;

/// Minimum interval between cosmetic (non-completion) IPC progress events.
/// Completion events (with `processed_item_id`) always fire immediately.
const PROGRESS_EMIT_INTERVAL_MS: u128 = 100; // ~10 FPS for UI updates

pub struct Controller {
    window: Window,
    cancel_flag: Arc<AtomicBool>,
}

/// Shared throttle state for progress event emission.
struct EmitThrottle {
    last_emit: Mutex<Instant>,
}

impl EmitThrottle {
    fn new() -> Self {
        Self {
            last_emit: Mutex::new(Instant::now()),
        }
    }

    /// Returns true if enough time has passed since the last cosmetic emit.
    fn should_emit_cosmetic(&self) -> bool {
        let mut last = self.last_emit.lock().unwrap();
        let now = Instant::now();
        if now.duration_since(*last).as_millis() >= PROGRESS_EMIT_INTERVAL_MS {
            *last = now;
            true
        } else {
            false
        }
    }

    /// Mark that a completion event was emitted (resets the timer so we
    /// don't double-fire a cosmetic event right after).
    fn mark_emitted(&self) {
        let mut last = self.last_emit.lock().unwrap();
        *last = Instant::now();
    }
}

impl Controller {
    pub fn new(window: Window, cancel_flag: Arc<AtomicBool>) -> Self {
        Self { window, cancel_flag }
    }
    
    pub async fn start_processing(&self, request: ProcessingRequest) -> ProcessingResult {
        self.cancel_flag.store(false, Ordering::SeqCst);
        
        let total = request.items.len();
        let completed = Arc::new(AtomicUsize::new(0));
        let total_saved = Arc::new(AtomicU64::new(0));
        let active_items = Arc::new(Mutex::new(HashSet::new()));
        let throttle = Arc::new(EmitThrottle::new());
        
        let concurrency = request.settings.advanced.concurrency;
        let semaphore = Arc::new(Semaphore::new(concurrency));
        
        let mut result = ProcessingResult {
            success_count: 0,
            skipped_count: 0,
            failed_count: 0,
            errors: Vec::new(),
            canceled: false,
            saved_bytes: 0,
        };

        let app_handle = self.window.app_handle().clone();
        let mut tasks = Vec::new();

        for item in request.items {
            let semaphore = semaphore.clone();
            let cancel_flag = self.cancel_flag.clone();
            let completed = completed.clone();
            let total_saved = total_saved.clone();
            let active_items = active_items.clone();
            let settings = request.settings.clone();
            let app_handle = app_handle.clone();
            let window = self.window.clone();
            let throttle = throttle.clone();

            let task = tokio::spawn(async move {
                let _permit = semaphore.acquire().await.unwrap();
                
                if cancel_flag.load(Ordering::SeqCst) {
                    return (item, WorkerResult {
                        success: false,
                        skipped: false,
                        error: Some("Cancelled".to_string()),
                        output_path: None,
                        saved_bytes: None,
                    });
                }

                // Guard to ensure item is removed from active_items even on panic/abort
                struct ActiveGuard {
                    id: String,
                    active_items: Arc<Mutex<HashSet<String>>>,
                    window: Window,
                    completed: Arc<AtomicUsize>,
                    total: usize,
                    total_saved: Arc<AtomicU64>,
                    throttle: Arc<EmitThrottle>,
                }
                impl Drop for ActiveGuard {
                    fn drop(&mut self) {
                        let mut active = self.active_items.lock().unwrap();
                        active.remove(&self.id);
                        
                        // Guard drop is cosmetic — only emit if throttle allows
                        if self.throttle.should_emit_cosmetic() {
                            let active_ids = active.iter().cloned().collect::<Vec<_>>();
                            let _ = self.window.emit("convert:progress", ProcessingProgress {
                                completed: self.completed.load(Ordering::SeqCst),
                                total: self.total,
                                current_item: None,
                                current_output_path: None,
                                message: None,
                                processed_item_id: None,
                                saved_bytes: Some(self.total_saved.load(Ordering::SeqCst)),
                                active_item_ids: Some(active_ids),
                            });
                        }
                    }
                }

                // Add to active items — cosmetic event, throttled
                let _guard = {
                    let mut active = active_items.lock().unwrap();
                    active.insert(item.id.clone());
                    
                    if throttle.should_emit_cosmetic() {
                        let active_ids = active.iter().cloned().collect::<Vec<_>>();
                        let _ = window.emit("convert:progress", ProcessingProgress {
                            completed: completed.load(Ordering::SeqCst),
                            total,
                            current_item: Some(item.clone()),
                            current_output_path: None,
                            message: Some(format!("Converting {}...", item.display_name)),
                            processed_item_id: None,
                            saved_bytes: Some(total_saved.load(Ordering::SeqCst)),
                            active_item_ids: Some(active_ids),
                        });
                    }

                    ActiveGuard {
                        id: item.id.clone(),
                        active_items: active_items.clone(),
                        window: window.clone(),
                        completed: completed.clone(),
                        total,
                        total_saved: total_saved.clone(),
                        throttle: throttle.clone(),
                    }
                };

                // Process item
                let worker = Worker::new(
                    item.clone(),
                    settings,
                    cancel_flag.clone(),
                    app_handle,
                );
                
                let worker_result = worker.process().await;

                // Update counters and emit completion events (always, not throttled)
                if worker_result.success {
                    let comp = completed.fetch_add(1, Ordering::SeqCst) + 1;
                    if let Some(saved) = worker_result.saved_bytes {
                        total_saved.fetch_add(saved, Ordering::SeqCst);
                    }

                    // Completion event — always emitted for correctness (item removal)
                    let active = active_items.lock().unwrap();
                    let active_ids = active.iter().cloned().collect::<Vec<_>>();
                    let _ = window.emit("convert:progress", ProcessingProgress {
                        completed: comp,
                        total,
                        current_item: Some(item.clone()),
                        current_output_path: worker_result.output_path.clone(),
                        message: None,
                        processed_item_id: Some(item.id.clone()),
                        saved_bytes: Some(total_saved.load(Ordering::SeqCst)),
                        active_item_ids: Some(active_ids),
                    });
                    throttle.mark_emitted();
                } else if worker_result.skipped {
                    completed.fetch_add(1, Ordering::SeqCst);
                    // Completion event — always emitted for correctness (item removal)
                    let active = active_items.lock().unwrap();
                    let active_ids = active.iter().cloned().collect::<Vec<_>>();
                    let _ = window.emit("convert:progress", ProcessingProgress {
                        completed: completed.load(Ordering::SeqCst),
                        total,
                        current_item: Some(item.clone()),
                        current_output_path: None,
                        message: None,
                        processed_item_id: Some(item.id.clone()),
                        saved_bytes: Some(total_saved.load(Ordering::SeqCst)),
                        active_item_ids: Some(active_ids),
                    });
                    throttle.mark_emitted();
                }

                (item, worker_result)
            });
            tasks.push(task);
        }

        let mut canceled = false;
        for task in tasks {
            if !canceled && self.cancel_flag.load(Ordering::SeqCst) {
                canceled = true;
                result.canceled = true;
            }

            if canceled {
                task.abort();
            }

            match task.await {
                Ok((item, worker_result)) => {
                    if !canceled {
                        if worker_result.success {
                            result.success_count += 1;
                            if let Some(saved) = worker_result.saved_bytes {
                                result.saved_bytes += saved;
                            }
                        } else if worker_result.skipped {
                            result.skipped_count += 1;
                        } else {
                            result.failed_count += 1;
                            if let Some(error) = worker_result.error {
                                result.errors.push(ProcessingError { item, error });
                            }
                        }
                    } else {
                        // Even if canceled, some tasks might have finished.
                        // We could count them, but usually it's better to just report "Canceled".
                    }
                }
                Err(_) => {
                    // Task was aborted or panicked
                }
            }
        }

        if self.cancel_flag.load(Ordering::SeqCst) {
            result.canceled = true;
        }
        
        result
    }

}
