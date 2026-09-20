use cueline_core::{
    error::{Error, Result},
    settings::{SecretKey, SecretStore},
    Secret,
};
use keyring::Entry;

const SERVICE: &str = "cueline";

pub struct KeyringSecretStore;

impl KeyringSecretStore {
    fn entry(key: SecretKey) -> Result<Entry> {
        Entry::new(SERVICE, key.account())
            .map_err(|error| Error::Settings(format!("Keychain is unavailable: {error}")))
    }
}

impl SecretStore for KeyringSecretStore {
    fn get(&self, key: SecretKey) -> Result<Option<Secret>> {
        match Self::entry(key)?.get_password() {
            Ok(value) => Ok(Some(Secret::new(value))),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(Error::Settings(format!(
                "Could not read from the keychain: {error}"
            ))),
        }
    }

    fn set(&self, key: SecretKey, value: &Secret) -> Result<()> {
        Self::entry(key)?
            .set_password(value.expose())
            .map_err(|error| Error::Settings(format!("Could not save to the keychain: {error}")))
    }

    fn delete(&self, key: SecretKey) -> Result<()> {
        match Self::entry(key)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(Error::Settings(format!(
                "Could not clear the keychain: {error}"
            ))),
        }
    }
}
