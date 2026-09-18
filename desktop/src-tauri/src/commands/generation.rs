use meet_copilot_core::domain::GenerationMode;
use tauri::{AppHandle, State};

use crate::{
    app::{answers, overlay, AppState},
    command_error::CommandError,
};

#[tauri::command]
pub async fn generate(mode: GenerationMode, app: AppHandle) -> Result<(), CommandError> {
    answers::ask(&app, mode).await?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_generation(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    state.answers().await.lock().await.cancel();
    overlay::hide(&app);

    Ok(())
}
