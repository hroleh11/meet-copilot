use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD, Engine};
use futures_util::{stream, StreamExt};
use reqwest::Method;
use serde::Serialize;

use crate::{
    backend::generate::{Delta, DeltaPayload, DeltaStream, DonePayload},
    domain::{GenerationMode, MeetingId},
    error::Result,
    screenshot::Screenshot,
};

use super::{
    sse::{self, SseFrame},
    transport::Transport,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct GenerateBody {
    mode: GenerationMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    screenshot: Option<ScreenshotBody>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScreenshotBody {
    mime_type: String,
    data_base64: String,
}

pub fn generate(
    transport: Arc<Transport>,
    meeting_id: &MeetingId,
    mode: GenerationMode,
    screenshot: Option<&Screenshot>,
) -> DeltaStream<'static> {
    let path = format!("meetings/{meeting_id}/generate");
    let body = GenerateBody {
        mode,
        screenshot: screenshot.map(|picture| ScreenshotBody {
            mime_type: picture.mime_type.clone(),
            data_base64: STANDARD.encode(&picture.bytes),
        }),
    };

    Box::pin(
        stream::once(async move {
            transport
                .authorized_stream(Method::POST, &path, Some(&body))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_plain_question_carries_only_the_mode() {
        let body = GenerateBody {
            mode: GenerationMode::Reply,
            screenshot: None,
        };

        assert_eq!(
            serde_json::to_value(&body).expect("serializes"),
            serde_json::json!({ "mode": "reply" })
        );
    }

    #[test]
    fn a_screenshot_rides_along_as_base64() {
        let picture = Screenshot {
            mime_type: "image/jpeg".to_owned(),
            bytes: vec![1, 2, 3],
        };
        let body = GenerateBody {
            mode: GenerationMode::Reply,
            screenshot: Some(ScreenshotBody {
                mime_type: picture.mime_type.clone(),
                data_base64: STANDARD.encode(&picture.bytes),
            }),
        };

        assert_eq!(
            serde_json::to_value(&body).expect("serializes"),
            serde_json::json!({
                "mode": "reply",
                "screenshot": { "mimeType": "image/jpeg", "dataBase64": "AQID" }
            })
        );
    }
}
