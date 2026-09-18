use tauri::{AppHandle, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use url::Url;

use crate::{
    app::{AppState, Emitter},
    commands::complete_login_from_deep_link,
};

pub fn register(app: &AppHandle) {
    let handle = app.clone();

    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            if let Some(code) = login_code(&url) {
                spawn_exchange(handle.clone(), code);
            }
        }
    });
}

fn login_code(url: &Url) -> Option<String> {
    if url.host_str() != Some("auth") {
        return None;
    }

    url.query_pairs()
        .find(|(key, _)| key == "code")
        .map(|(_, value)| value.into_owned())
}

fn spawn_exchange(handle: AppHandle, code: String) {
    tauri::async_runtime::spawn(async move {
        let state = handle.state::<AppState>();
        let emitter = Emitter::new(handle.clone());

        match complete_login_from_deep_link(&state, &code).await {
            Ok(auth) => emitter.auth_state(auth.into()),
            Err(error) => emitter.app_error(error.into()),
        }
    });
}
