pub mod controller;
pub mod worker;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

pub struct ProcessingState {
    pub cancel_requested: Arc<AtomicBool>,
}

impl ProcessingState {
    pub fn new() -> Self {
        Self {
            cancel_requested: Arc::new(AtomicBool::new(false)),
        }
    }
    
    pub fn request_cancel(&self) {
        self.cancel_requested.store(true, Ordering::SeqCst);
    }
    
    pub fn reset(&self) {
        self.cancel_requested.store(false, Ordering::SeqCst);
    }
}
