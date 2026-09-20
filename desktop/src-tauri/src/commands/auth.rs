use cueline_core::{backend::BackendApi, domain::Profile};
use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::{app::AppState, command_error::CommandError, events::AuthStateEvent};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthState {
    pub signed_in: bool,
    pub profile: Option<Profile>,
}

impl From<AuthState> for AuthStateEvent {
    fn from(state: AuthState) -> Self {
        Self {
            signed_in: state.signed_in,
            profile: state.profile,
        }
    }
}

#[tauri::command]
pub async fn auth_state(state: State<'_, AppState>) -> Result<AuthState, CommandError> {
    Ok(current_auth_state(&state).await)
}

#[tauri::command]
pub async fn start_login(app: AppHandle, state: State<'_, AppState>) -> Result<(), CommandError> {
    let settings = state.local_settings().await;
    let url = format!("{}/auth/google", settings.backend_url.trim_end_matches('/'));

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| CommandError::browser(error.to_string()))
}

#[tauri::command]
pub async fn sign_in(
    email: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<AuthState, CommandError> {
    state.backend().await.sign_in(&email, &password).await?;

    Ok(current_auth_state(&state).await)
}

#[tauri::command]
pub async fn complete_login(
    code: String,
    state: State<'_, AppState>,
) -> Result<AuthState, CommandError> {
    complete_login_from_deep_link(&state, &code).await
}

pub async fn complete_login_from_deep_link(
    state: &AppState,
    code: &str,
) -> Result<AuthState, CommandError> {
    state.backend().await.exchange_code(code).await?;

    Ok(current_auth_state(state).await)
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<AuthState, CommandError> {
    let backend = state.backend().await;
    let _ = backend.sign_out().await;

    Ok(current_auth_state(&state).await)
}

pub async fn current_auth_state(state: &AppState) -> AuthState {
    let backend = state.backend().await;

    if !backend.is_signed_in().await {
        return AuthState {
            signed_in: false,
            profile: None,
        };
    }

    match backend.me().await {
        Ok(profile) => AuthState {
            signed_in: true,
            profile: Some(profile),
        },
        Err(_) => AuthState {
            signed_in: false,
            profile: None,
        },
    }
}
