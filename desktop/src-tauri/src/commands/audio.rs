use meet_copilot_core::audio::{list_input_devices, AudioDevice};
use tauri::{AppHandle, State};

use crate::{
    app::{AppState, AudioCheckStatus, Emitter},
    command_error::CommandError,
};

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, CommandError> {
    Ok(list_input_devices()?)
}

#[tauri::command]
pub async fn start_audio_check(
    device_id: Option<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<AudioCheckStatus, CommandError> {
    Ok(state
        .start_audio_check(device_id, Emitter::new(app))
        .await?)
}

#[tauri::command]
pub async fn stop_audio_check(state: State<'_, AppState>) -> Result<(), CommandError> {
    state.stop_audio_check().await?;

    Ok(())
}
