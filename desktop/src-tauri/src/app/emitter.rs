use serde::Serialize;
use tauri::{AppHandle, Emitter as TauriEmitter};

use crate::events::{AppErrorEvent, AuthStateEvent, APP_ERROR, AUTH_STATE};

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

    fn send<T: Serialize + Clone>(&self, name: &str, payload: T) {
        if let Err(error) = self.handle.emit(name, payload) {
            eprintln!("could not emit {name}: {error}");
        }
    }
}
