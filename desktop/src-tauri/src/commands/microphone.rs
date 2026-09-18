use meet_copilot_core::audio::{list_input_devices, AudioDevice};
use tauri::{AppHandle, State};

use crate::{
    app::{AppState, Emitter},
    command_error::CommandError,
};

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, CommandError> {
    Ok(list_input_devices()?)
}

#[tauri::command]
pub async fn start_microphone_test(
    device_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    state
        .start_microphone_test(device_id, Emitter::new(app))
        .await?;

    Ok(())
}

#[tauri::command]
pub async fn stop_microphone_test(state: State<'_, AppState>) -> Result<(), CommandError> {
    state.stop_microphone_test().await?;

    Ok(())
}
