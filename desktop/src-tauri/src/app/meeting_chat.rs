use std::sync::Arc;

use futures_util::StreamExt;
use meet_copilot_core::{
    backend::ChatDelta,
    backend::{BackendApi, BackendClient, ChatId},
    domain::MeetingId,
};
use tauri::AppHandle;

use crate::{
    app::Emitter,
    command_error::CommandError,
    events::{ChatDeltaEvent, ChatFailedEvent, ChatFinishedEvent},
};

/// The answer is streamed so the user sees it forming, and the backend stores the
/// exchange itself, so nothing here has to be kept for the next time. Every chat
/// has its own window, so the events carry the chat they belong to.
pub fn ask(
    app: &AppHandle,
    backend: Arc<BackendClient>,
    meeting_id: MeetingId,
    chat_id: ChatId,
    question: String,
) {
    let emitter = Emitter::new(app.clone());

    tauri::async_runtime::spawn(async move {
        let mut answer = backend.ask_in_chat(&meeting_id, &chat_id, &question);

        while let Some(delta) = answer.next().await {
            match delta {
                Ok(ChatDelta::Text(text)) => emitter.chat_delta(ChatDeltaEvent {
                    chat_id: chat_id.clone(),
                    text,
                }),
                Ok(ChatDelta::Done { message_id }) => {
                    emitter.chat_finished(ChatFinishedEvent {
                        chat_id: chat_id.clone(),
                        message_id,
                    });
                    return;
                }
                Err(error) => {
                    emitter.chat_failed(ChatFailedEvent {
                        chat_id: chat_id.clone(),
                        message: CommandError::from(error).message,
                    });
                    return;
                }
            }
        }
    });
}
