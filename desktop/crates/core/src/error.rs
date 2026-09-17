use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("{0}")]
    Audio(String),

    #[error("{0}")]
    Backend(String),

    #[error("{0}")]
    Settings(String),

    #[error("{0}")]
    Permission(String),

    #[error("{0}")]
    Access(String),

    #[error("operation was cancelled")]
    Cancelled,
}
