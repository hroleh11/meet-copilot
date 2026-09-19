use meet_copilot_core::domain::{Language, MeetingProfile, SessionState};
use serde::Serialize;
use tauri::{AppHandle, State};

use crate::{
    app::{AppState, Emitter},
    command_error::CommandError,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartedMeeting {
    pub meeting_id: String,
    pub system_audio_problem: Option<String>,
}

#[tauri::command]
pub async fn session_state(state: State<'_, AppState>) -> Result<SessionState, CommandError> {
    Ok(state.session().await.lock().await.state())
}

#[tauri::command]
pub async fn start_session(
    profile: MeetingProfile,
    language: Language,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<StartedMeeting, CommandError> {
    let input_device = state.local_settings().await.input_device;
    let session = state.session().await;
    let mut session = session.lock().await;

    let started = session
        .start(profile, language, input_device, Emitter::new(app))
        .await?;

    Ok(StartedMeeting {
        meeting_id: started.meeting.id,
        system_audio_problem: started.system_audio_problem,
    })
}

#[tauri::command]
pub async fn stop_session(app: AppHandle, state: State<'_, AppState>) -> Result<(), CommandError> {
    state.answers().await.lock().await.cancel();

    let session = state.session().await;
    let mut session = session.lock().await;

    session.stop(Emitter::new(app)).await?;

    Ok(())
}
