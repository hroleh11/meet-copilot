use cueline_core::{
    audio::{list_input_devices, AudioDevice},
    error::Error,
};
use serde::{Deserialize, Serialize};
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

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AudioPermission {
    Microphone,
    SystemAudio,
}

/// Asking ScreenCaptureKit is the only answer worth showing, and it is a round
/// trip to macOS, so it runs off the UI thread.
#[tauri::command]
pub async fn system_audio_allowed() -> bool {
    #[cfg(target_os = "macos")]
    {
        tokio::task::spawn_blocking(cueline_platform_macos::capture_kit::capture_allowed)
            .await
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// macOS asks for a permission once and keeps the answer, so a source that is
/// not allowed can only be fixed in System Settings.
#[tauri::command]
pub fn open_audio_permission(permission: AudioPermission) -> Result<(), CommandError> {
    #[cfg(target_os = "macos")]
    {
        use cueline_platform_macos::permissions::{open_privacy_settings, PrivacyPane};

        let pane = match permission {
            AudioPermission::Microphone => PrivacyPane::Microphone,
            AudioPermission::SystemAudio => PrivacyPane::ScreenRecording,
        };

        if !open_privacy_settings(pane) {
            return Err(CommandError::from(Error::Permission(
                "Could not open System Settings".to_owned(),
            )));
        }
    }

    Ok(())
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
