use std::{fs, path::PathBuf};

use crate::{error::Error, error::Result, settings::local::LocalSettings};

pub struct LocalSettingsStore {
    path: PathBuf,
}

impl LocalSettingsStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> LocalSettings {
        fs::read_to_string(&self.path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default()
    }

    pub fn save(&self, settings: &LocalSettings) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                Error::Settings(format!("Could not create the settings folder: {error}"))
            })?;
        }

        let encoded = serde_json::to_string_pretty(settings)
            .map_err(|error| Error::Settings(format!("Could not encode the settings: {error}")))?;

        fs::write(&self.path, encoded)
            .map_err(|error| Error::Settings(format!("Could not save the settings: {error}")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        std::env::temp_dir()
            .join("meet-copilot-tests")
            .join(format!("{name}.json"))
    }

    #[test]
    fn missing_file_yields_defaults() {
        let store = LocalSettingsStore::new(temp_path("missing"));

        assert_eq!(store.load(), LocalSettings::default());
    }

    #[test]
    fn saved_settings_come_back() {
        let path = temp_path("roundtrip");
        let _ = fs::remove_file(&path);
        let store = LocalSettingsStore::new(path);

        let settings = LocalSettings {
            backend_url: "http://example.test/api/v1".to_owned(),
            input_device: Some("Built-in".to_owned()),
            ..LocalSettings::default()
        };

        store.save(&settings).expect("saves");

        assert_eq!(store.load(), settings);
    }

    #[test]
    fn a_corrupt_file_falls_back_to_defaults_instead_of_failing() {
        let path = temp_path("corrupt");
        fs::create_dir_all(path.parent().expect("has a parent")).expect("creates the folder");
        fs::write(&path, "{ this is not json").expect("writes");

        assert_eq!(
            LocalSettingsStore::new(path).load(),
            LocalSettings::default()
        );
    }

    #[test]
    fn unknown_fields_and_missing_fields_still_load() {
        let path = temp_path("partial");
        fs::create_dir_all(path.parent().expect("has a parent")).expect("creates the folder");
        fs::write(
            &path,
            r#"{"backendUrl":"http://example.test","somethingNew":1}"#,
        )
        .expect("writes");

        let loaded = LocalSettingsStore::new(path).load();

        assert_eq!(loaded.backend_url, "http://example.test");
        assert_eq!(loaded.hotkeys, crate::settings::Hotkeys::default());
    }
}
