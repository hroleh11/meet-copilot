use async_trait::async_trait;
use meet_copilot_core::{
    access::{AccessPolicy, DenialReason, Entitlement},
    error::Result,
};

pub struct FakeAccess(Entitlement);

impl FakeAccess {
    pub fn allowed() -> Self {
        Self(Entitlement::Allowed)
    }

    pub fn denied(reason: DenialReason) -> Self {
        Self(Entitlement::Denied { reason })
    }
}

#[async_trait]
impl AccessPolicy for FakeAccess {
    async fn check(&self) -> Result<Entitlement> {
        Ok(self.0)
    }
}
