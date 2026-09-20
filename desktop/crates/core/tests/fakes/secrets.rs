use cueline_core::{
    error::Result,
    secret::Secret,
    settings::{SecretKey, SecretStore},
};

pub struct EmptySecrets;

impl SecretStore for EmptySecrets {
    fn get(&self, _key: SecretKey) -> Result<Option<Secret>> {
        Ok(None)
    }

    fn set(&self, _key: SecretKey, _value: &Secret) -> Result<()> {
        Ok(())
    }

    fn delete(&self, _key: SecretKey) -> Result<()> {
        Ok(())
    }
}
