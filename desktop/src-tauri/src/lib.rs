pub mod app;
pub mod command_error;
pub mod commands;
pub mod deep_link;
pub mod events;
pub mod secrets;

use meet_copilot_core::settings::LocalSettingsStore;
use tauri::Manager;

use crate::app::AppState;

const SETTINGS_FILE: &str = "settings.json";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            let directory = app.path().app_config_dir()?;
            let state = AppState::load(
                LocalSettingsStore::new(directory.join(SETTINGS_FILE)),
                secrets::secret_store(&directory),
            )?;

            app.manage(state);
            deep_link::register(app.handle());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth_state,
            commands::start_login,
            commands::complete_login,
            commands::logout,
            commands::get_local_settings,
            commands::save_local_settings,
            commands::get_user_settings,
            commands::save_user_settings,
            commands::check_backend,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
