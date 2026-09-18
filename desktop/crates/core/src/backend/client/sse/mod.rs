mod parser;

use futures_util::{stream, Stream, StreamExt};
use reqwest::Response;

use crate::{
    backend::generate::{Delta, DeltaPayload, DonePayload, ErrorPayload},
    backend_failure::BackendFailure,
    error::{Error, Result},
};

use parser::{SseFrame, SseParser};

use super::failure::transport_error;

pub fn deltas(response: Response) -> impl Stream<Item = Result<Delta>> {
    let chunks = response.bytes_stream();

    stream::unfold(
        (chunks, SseParser::default()),
        |(mut chunks, mut parser)| async move {
            loop {
                let chunk = match chunks.next().await? {
                    Ok(chunk) => chunk,
                    Err(error) => {
                        return Some((vec![Err(transport_error(error))], (chunks, parser)))
                    }
                };

                let frames: Vec<Result<Delta>> = match std::str::from_utf8(&chunk) {
                    Ok(text) => parser.push(text).into_iter().map(read).collect(),
                    Err(_) => vec![Err(Error::backend(
                        BackendFailure::Unexpected,
                        Some("The answer arrived in a shape we cannot read".to_owned()),
                    ))],
                };

                if !frames.is_empty() {
                    return Some((frames, (chunks, parser)));
                }
            }
        },
    )
    .flat_map(stream::iter)
}

fn read(frame: SseFrame) -> Result<Delta> {
    match frame.event.as_str() {
        "delta" => decode::<DeltaPayload>(&frame.data).map(|payload| Delta::Text(payload.text)),
        "done" => decode::<DonePayload>(&frame.data).map(|payload| Delta::Done {
            generation_id: payload.generation_id,
            stop_reason: payload.stop_reason,
            usage: payload.usage,
        }),
        "error" => Err(Error::backend(
            BackendFailure::Unexpected,
            decode::<ErrorPayload>(&frame.data)
                .ok()
                .map(|payload| payload.message),
        )),
        _ => Err(Error::backend(
            BackendFailure::Unexpected,
            Some(format!("The server sent an unknown event {}", frame.event)),
        )),
    }
}

fn decode<T: serde::de::DeserializeOwned>(data: &str) -> Result<T> {
    serde_json::from_str(data).map_err(|error| {
        Error::backend(
            BackendFailure::Unexpected,
            Some(format!("The answer could not be read: {error}")),
        )
    })
}
