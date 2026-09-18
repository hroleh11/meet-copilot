use std::sync::Arc;

use meet_copilot_core::{
    backend::{BackendClient, BackendEndpoint},
    error::Result,
    settings::{LocalSettings, LocalSettingsStore, SecretStore},
};
use tokio::sync::{Mutex, RwLock};

use super::{AudioCheck, AudioCheckStatus, Emitter};

pub struct AppState {
    settings_store: LocalSettingsStore,
    secrets: Arc<dyn SecretStore>,
    settings: RwLock<LocalSettings>,
    backend: RwLock<Arc<BackendClient>>,
    audio_check: Mutex<Option<AudioCheck>>,
}

impl AppState {
    pub fn load(settings_store: LocalSettingsStore, secrets: Arc<dyn SecretStore>) -> Result<Self> {
        let settings = settings_store.load();
        let backend = build_backend(&settings, Arc::clone(&secrets))?;

        Ok(Self {
            settings_store,
            secrets,
            settings: RwLock::new(settings),
            backend: RwLock::new(backend),
            audio_check: Mutex::new(None),
        })
    }

    pub async fn backend(&self) -> Arc<BackendClient> {
        Arc::clone(&*self.backend.read().await)
    }

    pub async fn local_settings(&self) -> LocalSettings {
        self.settings.read().await.clone()
    }

    pub async fn save_local_settings(&self, settings: LocalSettings) -> Result<LocalSettings> {
        let rebuild = self.settings.read().await.backend_url != settings.backend_url;

        self.settings_store.save(&settings)?;

        if rebuild {
            *self.backend.write().await = build_backend(&settings, Arc::clone(&self.secrets))?;
        }

        *self.settings.write().await = settings.clone();

        Ok(settings)
    }

    pub async fn start_audio_check(
        &self,
        device_id: Option<String>,
        emitter: Emitter,
    ) -> Result<AudioCheckStatus> {
        let mut slot = self.audio_check.lock().await;

        if let Some(previous) = slot.take() {
            previous.stop()?;
        }

        let (check, status) = AudioCheck::start(device_id, emitter)?;
        *slot = Some(check);

        Ok(status)
    }

    pub async fn stop_audio_check(&self) -> Result<()> {
        if let Some(check) = self.audio_check.lock().await.take() {
            check.stop()?;
        }

        Ok(())
    }
}

fn build_backend(
    settings: &LocalSettings,
    secrets: Arc<dyn SecretStore>,
) -> Result<Arc<BackendClient>> {
    Ok(Arc::new(BackendClient::new(
        BackendEndpoint::new(&settings.backend_url),
        secrets,
    )?))
}
