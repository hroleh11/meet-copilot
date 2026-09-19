mod parser;

use futures_util::{stream, Stream, StreamExt};
use reqwest::Response;

use crate::{
    backend::generate::ErrorPayload,
    backend_failure::BackendFailure,
    error::{Error, Result},
};

pub use parser::SseFrame;
use parser::SseParser;

use super::failure::transport_error;

/// Every stream the backend serves speaks the same frames, and what a `done`
/// event carries differs per feature, so the frames are handed over raw.
pub fn frames(response: Response) -> impl Stream<Item = Result<SseFrame>> {
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

                let frames: Vec<Result<SseFrame>> = match std::str::from_utf8(&chunk) {
                    Ok(text) => parser.push(text).into_iter().map(Ok).collect(),
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

pub fn decode<T: serde::de::DeserializeOwned>(data: &str) -> Result<T> {
    serde_json::from_str(data).map_err(|error| {
        Error::backend(
            BackendFailure::Unexpected,
            Some(format!("The answer could not be read: {error}")),
        )
    })
}

pub fn unknown_event(event: &str) -> Error {
    Error::backend(
        BackendFailure::Unexpected,
        Some(format!("The server sent an unknown event {event}")),
    )
}

pub fn reported_error(data: &str) -> Error {
    Error::backend(
        BackendFailure::Unexpected,
        decode::<ErrorPayload>(data)
            .ok()
            .map(|payload| payload.message),
    )
}
