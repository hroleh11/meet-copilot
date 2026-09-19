use meet_copilot_core::{
    backend::{BackendApi, ChatId, ChatMessage, ChatSession},
    domain::{Meeting, MeetingDetails, MeetingId},
};
use tauri::{AppHandle, State};

use crate::{
    app::{meeting_chat, AppState},
    command_error::CommandError,
};

const PAGE: u32 = 20;

#[tauri::command]
pub async fn list_meetings(
    cursor: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Meeting>, CommandError> {
    Ok(state
        .backend()
        .await
        .list_meetings(PAGE, cursor.as_deref())
        .await?)
}

#[tauri::command]
pub async fn meeting_chats(
    id: MeetingId,
    query: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ChatSession>, CommandError> {
    Ok(state
        .backend()
        .await
        .meeting_chats(&id, query.as_deref())
        .await?)
}

#[tauri::command]
pub async fn start_meeting_chat(
    id: MeetingId,
    state: State<'_, AppState>,
) -> Result<ChatSession, CommandError> {
    Ok(state.backend().await.start_meeting_chat(&id).await?)
}

#[tauri::command]
pub async fn chat_messages(
    id: MeetingId,
    chat: ChatId,
    state: State<'_, AppState>,
) -> Result<Vec<ChatMessage>, CommandError> {
    Ok(state.backend().await.chat_messages(&id, &chat).await?)
}

#[tauri::command]
pub async fn delete_meeting_chat(
    id: MeetingId,
    chat: ChatId,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    Ok(state
        .backend()
        .await
        .delete_meeting_chat(&id, &chat)
        .await?)
}

#[tauri::command]
pub async fn ask_in_chat(
    id: MeetingId,
    chat: ChatId,
    question: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    meeting_chat::ask(&app, state.backend().await, id, chat, question);

    Ok(())
}

#[tauri::command]
pub async fn get_meeting(
    id: MeetingId,
    state: State<'_, AppState>,
) -> Result<MeetingDetails, CommandError> {
    Ok(state.backend().await.meeting(&id).await?)
}
