use std::sync::Arc;

use futures_util::{stream, StreamExt};
use reqwest::Method;
use serde::Serialize;

use crate::{
    backend::generate::DeltaStream,
    domain::{GenerationMode, MeetingId},
};

use super::{sse, transport::Transport};

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
            Ok(response) => sse::deltas(response).left_stream(),
            Err(error) => stream::once(async move { Err(error) }).right_stream(),
        }),
    )
}
