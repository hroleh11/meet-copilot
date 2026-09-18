use serde::Serialize;
use tauri::{AppHandle, Emitter as TauriEmitter};

use crate::events::{
    AppErrorEvent, AudioLevelEvent, AuthStateEvent, APP_ERROR, AUDIO_LEVEL, AUTH_STATE,
};

#[derive(Clone)]
pub struct Emitter {
    handle: AppHandle,
}

impl Emitter {
    pub fn new(handle: AppHandle) -> Self {
        Self { handle }
    }

    pub fn auth_state(&self, event: AuthStateEvent) {
        self.send(AUTH_STATE, event);
    }

    pub fn app_error(&self, event: AppErrorEvent) {
        self.send(APP_ERROR, event);
    }

    pub fn audio_level(&self, event: AudioLevelEvent) {
        self.send(AUDIO_LEVEL, event);
    }

    fn send<T: Serialize + Clone>(&self, name: &str, payload: T) {
        if let Err(error) = self.handle.emit(name, payload) {
            eprintln!("could not emit {name}: {error}");
        }
    }
}
