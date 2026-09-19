use thiserror::Error;

use crate::backend_failure::BackendFailure;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("{0}")]
    Audio(String),

    #[error("{message}")]
    Backend {
        failure: BackendFailure,
        message: String,
    },

    #[error("{0}")]
    Settings(String),

    #[error("{0}")]
    Permission(String),

    #[error("{0}")]
    Access(String),

    #[error("{0}")]
    Screen(String),

    #[error("{0}")]
    Session(String),

    #[error("operation was cancelled")]
    Cancelled,
}

impl Error {
    pub fn backend(failure: BackendFailure, message: Option<String>) -> Self {
        Self::Backend {
            failure,
            message: message
                .filter(|text| !text.trim().is_empty())
                .unwrap_or_else(|| failure.default_message().to_owned()),
        }
    }

    pub fn from_http_status(status: u16, message: Option<String>) -> Self {
        Self::backend(BackendFailure::from_http_status(status), message)
    }

    pub fn from_close_code(code: u16, message: Option<String>) -> Self {
        Self::backend(BackendFailure::from_close_code(code), message)
    }

    pub fn unreachable(detail: impl std::fmt::Display) -> Self {
        Self::backend(
            BackendFailure::Unavailable,
            Some(format!("The service is unreachable right now: {detail}")),
        )
    }

    pub fn backend_failure(&self) -> Option<BackendFailure> {
        match self {
            Self::Backend { failure, .. } => Some(*failure),
            _ => None,
        }
    }
}
