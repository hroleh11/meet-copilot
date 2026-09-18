use meet_copilot_core::{
    backend::BackendApi,
    domain::{Meeting, MeetingDetails, MeetingId},
};
use tauri::State;

use crate::{app::AppState, command_error::CommandError};

#[tauri::command]
pub async fn list_meetings(state: State<'_, AppState>) -> Result<Vec<Meeting>, CommandError> {
    Ok(state.backend().await.list_meetings().await?)
}

#[tauri::command]
pub async fn get_meeting(
    id: MeetingId,
    state: State<'_, AppState>,
) -> Result<MeetingDetails, CommandError> {
    Ok(state.backend().await.meeting(&id).await?)
}
