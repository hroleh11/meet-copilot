use std::sync::Arc;

use futures_util::{stream, StreamExt};
use reqwest::Method;
use serde::Serialize;

use crate::{
    backend::{
        chat::{ChatDelta, ChatDonePayload, ChatId, ChatStream},
        generate::DeltaPayload,
    },
    domain::MeetingId,
    error::Result,
};

use super::{
    sse::{self, SseFrame},
    transport::Transport,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AskBody<'a> {
    question: &'a str,
}

pub fn ask(
    transport: Arc<Transport>,
    meeting_id: &MeetingId,
    chat_id: &ChatId,
    question: &str,
) -> ChatStream<'static> {
    let path = format!("meetings/{meeting_id}/chats/{chat_id}");
    let question = question.to_owned();

    Box::pin(
        stream::once(async move {
            transport
                .authorized_stream(
                    Method::POST,
                    &path,
                    Some(&AskBody {
                        question: &question,
                    }),
                )
                .await
        })
        .flat_map(|opened| match opened {
            Ok(response) => sse::frames(response).map(read).left_stream(),
            Err(error) => stream::once(async move { Err(error) }).right_stream(),
        }),
    )
}

fn read(frame: Result<SseFrame>) -> Result<ChatDelta> {
    let frame = frame?;

    match frame.event.as_str() {
        "delta" => {
            sse::decode::<DeltaPayload>(&frame.data).map(|payload| ChatDelta::Text(payload.text))
        }
        "done" => sse::decode::<ChatDonePayload>(&frame.data).map(|payload| ChatDelta::Done {
            message_id: payload.message_id,
        }),
        "error" => Err(sse::reported_error(&frame.data)),
        event => Err(sse::unknown_event(event)),
    }
}
