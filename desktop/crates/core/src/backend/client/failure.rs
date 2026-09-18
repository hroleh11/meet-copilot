use serde::Deserialize;

use crate::{
    backend_failure::BackendFailure,
    error::{Error, Result},
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ErrorBody {
    message: Option<String>,
}

pub async fn into_error(response: reqwest::Response) -> Error {
    let status = response.status().as_u16();
    let message = response
        .json::<ErrorBody>()
        .await
        .ok()
        .and_then(|body| body.message);

    Error::from_http_status(status, message)
}

pub fn transport_error(error: reqwest::Error) -> Error {
    if error.is_timeout() {
        return Error::backend(
            BackendFailure::Unavailable,
            Some("The service did not answer in time".to_owned()),
        );
    }

    Error::unreachable(error)
}

pub fn decode_error(error: reqwest::Error) -> Error {
    Error::backend(
        BackendFailure::Unexpected,
        Some(format!("The service sent something unexpected: {error}")),
    )
}

pub fn expect_signed_in<T>(value: Option<T>) -> Result<T> {
    value.ok_or_else(|| Error::backend(BackendFailure::Unauthorized, None))
}
