use std::{collections::BTreeMap, fs, path::Path, path::PathBuf};

use cueline_core::{
    error::{Error, Result},
    settings::{SecretKey, SecretStore},
    Secret,
};

pub struct FileSecretStore {
    path: PathBuf,
}

impl FileSecretStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    fn read_all(&self) -> BTreeMap<String, String> {
        fs::read_to_string(&self.path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    fn write_all(&self, entries: &BTreeMap<String, String>) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(store_error)?;
        }

        let encoded = serde_json::to_string_pretty(entries).map_err(|error| {
            Error::Settings(format!("Could not encode the stored tokens: {error}"))
        })?;

        fs::write(&self.path, encoded).map_err(store_error)?;
        restrict_to_owner(&self.path)
    }
}

impl SecretStore for FileSecretStore {
    fn get(&self, key: SecretKey) -> Result<Option<Secret>> {
        Ok(self.read_all().get(key.account()).map(Secret::new))
    }

    fn set(&self, key: SecretKey, value: &Secret) -> Result<()> {
        let mut entries = self.read_all();
        entries.insert(key.account().to_owned(), value.expose().to_owned());

        self.write_all(&entries)
    }

    fn delete(&self, key: SecretKey) -> Result<()> {
        let mut entries = self.read_all();
        entries.remove(key.account());

        self.write_all(&entries)
    }
}

fn store_error(error: std::io::Error) -> Error {
    Error::Settings(format!("Could not reach the token file: {error}"))
}

#[cfg(unix)]
fn restrict_to_owner(path: &Path) -> Result<()> {
    use std::os::unix::fs::PermissionsExt;

    fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(store_error)
}

#[cfg(not(unix))]
fn restrict_to_owner(_path: &Path) -> Result<()> {
    Ok(())
}
