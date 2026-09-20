use std::time::Duration;

use cueline_core::domain::SessionState;
use tauri::{AppHandle, Manager};

use super::{AppState, Emitter};

const GRACE: Duration = Duration::from_secs(5);

pub fn on_exit(handle: &AppHandle) {
    let Some(state) = handle.try_state::<AppState>() else {
        return;
    };

    let emitter = Emitter::new(handle.clone());

    tauri::async_runtime::block_on(async {
        if tokio::time::timeout(GRACE, stop(&state, emitter))
            .await
            .is_err()
        {
            tracing::warn!("the meeting did not stop before the app closed");
        }
    });
}

async fn stop(state: &AppState, emitter: Emitter) {
    if let Err(error) = state.stop_audio_check().await {
        tracing::warn!("could not stop the audio check: {error}");
    }

    let session = state.session().await;
    let mut session = session.lock().await;

    if session.state() == SessionState::Idle {
        return;
    }

    if let Err(error) = session.stop(emitter).await {
        tracing::warn!("could not finish the meeting: {error}");
    }
}
