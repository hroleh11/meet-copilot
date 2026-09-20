use cueline_core::{backend::BackendApi, domain::UserSettings, settings::LocalSettings};
use tauri::{AppHandle, State};

use crate::{
    app::{hotkeys, AppState},
    command_error::CommandError,
};

#[tauri::command]
pub async fn get_local_settings(state: State<'_, AppState>) -> Result<LocalSettings, CommandError> {
    Ok(state.local_settings().await)
}

#[tauri::command]
pub async fn save_local_settings(
    settings: LocalSettings,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<LocalSettings, CommandError> {
    let rebind = state.local_settings().await.hotkeys != settings.hotkeys;
    let saved = state.save_local_settings(settings).await?;

    if rebind {
        hotkeys::register(&app, &saved.hotkeys);
    }

    Ok(saved)
}

#[tauri::command]
pub async fn get_user_settings(state: State<'_, AppState>) -> Result<UserSettings, CommandError> {
    Ok(state.backend().await.user_settings().await?)
}

#[tauri::command]
pub async fn save_user_settings(
    settings: UserSettings,
    state: State<'_, AppState>,
) -> Result<UserSettings, CommandError> {
    Ok(state.backend().await.save_user_settings(&settings).await?)
}

#[tauri::command]
pub async fn check_backend(state: State<'_, AppState>) -> Result<String, CommandError> {
    Ok(state.backend().await.health().await?.status)
}
