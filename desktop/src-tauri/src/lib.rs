pub mod app;
pub mod command_error;
pub mod commands;
pub mod deep_link;
pub mod events;
pub mod logging;
pub mod secrets;

use meet_copilot_core::settings::LocalSettingsStore;
use tauri::Manager;

use crate::app::AppState;

const SETTINGS_FILE: &str = "settings.json";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            if let Some(guard) = logging::start(&log_directory(app.handle())?) {
                app.manage(guard);
            }

            let directory = app.path().app_config_dir()?;
            let settings_store = LocalSettingsStore::new(directory.join(SETTINGS_FILE));
            let hotkeys = settings_store.load().hotkeys;
            let state = AppState::load(settings_store, secrets::secret_store(&directory))?;

            app.manage(state);
            deep_link::register(app.handle());
            app::overlay::prepare(app.handle());
            app::hotkeys::register(app.handle(), &hotkeys);

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
            commands::list_audio_devices,
            commands::start_audio_check,
            commands::stop_audio_check,
            commands::list_meetings,
            commands::get_meeting,
            commands::session_state,
            commands::start_session,
            commands::stop_session,
            commands::generate,
            commands::cancel_generation,
        ])
        .build(tauri::generate_context!())
        .expect("error while building the application")
        .run(|handle, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                app::on_exit(handle);
            }
        });
}

fn log_directory(handle: &tauri::AppHandle) -> Result<std::path::PathBuf, tauri::Error> {
    let directory = handle.path().app_log_dir()?;
    std::fs::create_dir_all(&directory)?;

    Ok(directory)
}
