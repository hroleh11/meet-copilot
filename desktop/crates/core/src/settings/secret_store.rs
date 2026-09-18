use crate::{error::Result, secret::Secret};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecretKey {
    AccessToken,
    RefreshToken,
}

impl SecretKey {
    pub fn account(self) -> &'static str {
        match self {
            Self::AccessToken => "access-token",
            Self::RefreshToken => "refresh-token",
        }
    }
}

pub trait SecretStore: Send + Sync {
    fn get(&self, key: SecretKey) -> Result<Option<Secret>>;
    fn set(&self, key: SecretKey, value: &Secret) -> Result<()>;
    fn delete(&self, key: SecretKey) -> Result<()>;
}
