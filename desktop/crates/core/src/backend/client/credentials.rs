use std::sync::Arc;

use tokio::sync::RwLock;

use crate::{
    backend::endpoint::Tokens,
    error::Result,
    secret::Secret,
    settings::{SecretKey, SecretStore},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Credentials {
    pub access: Secret,
    pub refresh: Secret,
}

pub struct CredentialHolder {
    secrets: Arc<dyn SecretStore>,
    cached: RwLock<Option<Credentials>>,
}

impl CredentialHolder {
    pub fn load(secrets: Arc<dyn SecretStore>) -> Result<Self> {
        let access = secrets.get(SecretKey::AccessToken)?;
        let refresh = secrets.get(SecretKey::RefreshToken)?;

        let cached = match (access, refresh) {
            (Some(access), Some(refresh)) => Some(Credentials { access, refresh }),
            _ => None,
        };

        Ok(Self {
            secrets,
            cached: RwLock::new(cached),
        })
    }

    pub async fn current(&self) -> Option<Credentials> {
        self.cached.read().await.clone()
    }

    pub async fn is_signed_in(&self) -> bool {
        self.cached.read().await.is_some()
    }

    pub async fn store(&self, tokens: &Tokens) -> Result<()> {
        let credentials = Credentials {
            access: Secret::new(tokens.access_token.clone()),
            refresh: Secret::new(tokens.refresh_token.clone()),
        };

        self.secrets
            .set(SecretKey::AccessToken, &credentials.access)?;
        self.secrets
            .set(SecretKey::RefreshToken, &credentials.refresh)?;
        *self.cached.write().await = Some(credentials);

        Ok(())
    }

    pub async fn clear(&self) -> Result<()> {
        self.secrets.delete(SecretKey::AccessToken)?;
        self.secrets.delete(SecretKey::RefreshToken)?;
        *self.cached.write().await = None;

        Ok(())
    }
}
