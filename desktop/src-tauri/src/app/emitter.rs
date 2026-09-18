use serde::Serialize;
use tauri::{AppHandle, Emitter as TauriEmitter};

use crate::events::{
    AppErrorEvent, AudioLevelEvent, AuthStateEvent, GenerationDeltaEvent, GenerationFailedEvent,
    GenerationFinishedEvent, GenerationStartedEvent, SessionStateEvent, SourceStatusEvent,
    TranscriptSegmentEvent, APP_ERROR, AUDIO_LEVEL, AUTH_STATE, GENERATION_DELTA,
    GENERATION_FAILED, GENERATION_FINISHED, GENERATION_STARTED, SESSION_STATE, SOURCE_STATUS,
    TRANSCRIPT_SEGMENT,
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

    pub fn session_state(&self, event: SessionStateEvent) {
        self.send(SESSION_STATE, event);
    }

    pub fn transcript_segment(&self, event: TranscriptSegmentEvent) {
        self.send(TRANSCRIPT_SEGMENT, event);
    }

    pub fn source_status(&self, event: SourceStatusEvent) {
        self.send(SOURCE_STATUS, event);
    }

    pub fn generation_started(&self, event: GenerationStartedEvent) {
        self.send(GENERATION_STARTED, event);
    }

    pub fn generation_delta(&self, event: GenerationDeltaEvent) {
        self.send(GENERATION_DELTA, event);
    }

    pub fn generation_finished(&self, event: GenerationFinishedEvent) {
        self.send(GENERATION_FINISHED, event);
    }

    pub fn generation_failed(&self, event: GenerationFailedEvent) {
        self.send(GENERATION_FAILED, event);
    }

    fn send<T: Serialize + Clone>(&self, name: &str, payload: T) {
        if let Err(error) = self.handle.emit(name, payload) {
            tracing::warn!("could not emit {name}: {error}");
        }
    }
}
