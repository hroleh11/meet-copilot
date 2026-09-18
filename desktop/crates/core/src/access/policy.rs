use async_trait::async_trait;
use serde::Serialize;

use crate::error::Result;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DenialReason {
    NotSignedIn,
    NoSubscription,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum Entitlement {
    Allowed,
    Denied { reason: DenialReason },
}

impl Entitlement {
    pub fn is_allowed(self) -> bool {
        matches!(self, Self::Allowed)
    }
}

#[async_trait]
pub trait AccessPolicy: Send + Sync {
    async fn check(&self) -> Result<Entitlement>;
}

#[derive(Debug, Default)]
pub struct AlwaysAllowed;

#[async_trait]
impl AccessPolicy for AlwaysAllowed {
    async fn check(&self) -> Result<Entitlement> {
        Ok(Entitlement::Allowed)
    }
}
