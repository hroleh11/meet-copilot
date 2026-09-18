use meet_copilot_core::audio::{list_input_devices, AudioDevice};
use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
    app::{bluetooth_names, AppState, AudioCheckStatus, Emitter},
    command_error::CommandError,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioInput {
    #[serde(flatten)]
    pub device: AudioDevice,
    pub bluetooth: bool,
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioInput>, CommandError> {
    let bluetooth = bluetooth_names();

    Ok(list_input_devices()?
        .into_iter()
        .map(|device| AudioInput {
            bluetooth: bluetooth.contains(&device.name),
            device,
        })
        .collect())
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
