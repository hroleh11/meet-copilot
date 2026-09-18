mod file_store;
mod keyring_store;

use std::{path::Path, sync::Arc};

use meet_copilot_core::settings::SecretStore;

pub use file_store::FileSecretStore;
pub use keyring_store::KeyringSecretStore;

const TOKEN_FILE: &str = "tokens.json";

pub fn secret_store(config_dir: &Path) -> Arc<dyn SecretStore> {
    if cfg!(debug_assertions) {
        Arc::new(FileSecretStore::new(config_dir.join(TOKEN_FILE)))
    } else {
        Arc::new(KeyringSecretStore)
    }
}
