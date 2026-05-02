use crate::processing::{controller::Controller, ProcessingState};
use crate::types::{ProcessingRequest, ProcessingResult};
use tauri::{Emitter, State, Window};

#[tauri::command]
pub async fn start_conversion(
    window: Window,
    state: State<'_, ProcessingState>,
    request: ProcessingRequest,
) -> Result<ProcessingResult, String> {
    state.reset();

    let controller = Controller::new(window.clone(), state.cancel_requested.clone());
    let result = controller.start_processing(request).await;

    // Emit completion event
    window
        .emit("convert:complete", &result)
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub async fn cancel_conversion(state: State<'_, ProcessingState>) -> Result<(), String> {
    state.request_cancel();
    Ok(())
}
