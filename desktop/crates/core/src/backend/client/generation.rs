use std::sync::Arc;

use futures_util::{stream, StreamExt};
use reqwest::Method;
use serde::Serialize;

use crate::{
    backend::generate::{Delta, DeltaPayload, DeltaStream, DonePayload},
    domain::{GenerationMode, MeetingId},
    error::Result,
};

use super::{
    sse::{self, SseFrame},
    transport::Transport,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerateBody {
    mode: GenerationMode,
}

pub fn generate(
    transport: Arc<Transport>,
    meeting_id: &MeetingId,
    mode: GenerationMode,
) -> DeltaStream<'static> {
    let path = format!("meetings/{meeting_id}/generate");

    Box::pin(
        stream::once(async move {
            transport
                .authorized_stream(Method::POST, &path, Some(&GenerateBody { mode }))
                .await
        })
        .flat_map(|opened| match opened {
            Ok(response) => sse::frames(response).map(read).left_stream(),
            Err(error) => stream::once(async move { Err(error) }).right_stream(),
        }),
    )
}

fn read(frame: Result<SseFrame>) -> Result<Delta> {
    let frame = frame?;

    match frame.event.as_str() {
        "delta" => {
            sse::decode::<DeltaPayload>(&frame.data).map(|payload| Delta::Text(payload.text))
        }
        "done" => sse::decode::<DonePayload>(&frame.data).map(|payload| Delta::Done {
            generation_id: payload.generation_id,
            stop_reason: payload.stop_reason,
            usage: payload.usage,
        }),
        "error" => Err(sse::reported_error(&frame.data)),
        event => Err(sse::unknown_event(event)),
    }
}
