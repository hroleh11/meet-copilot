pub mod app;
pub mod command_error;
pub mod commands;
pub mod deep_link;
pub mod events;
pub mod logging;
pub mod secrets;

use cueline_core::settings::LocalSettingsStore;
use tauri::Manager;

use crate::app::AppState;

const SETTINGS_FILE: &str = "settings.json";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
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
            commands::sign_in,
            commands::start_login,
            commands::complete_login,
            commands::logout,
            commands::get_local_settings,
            commands::save_local_settings,
            commands::get_user_settings,
            commands::save_user_settings,
            commands::check_backend,
            commands::list_audio_devices,
            commands::open_audio_permission,
            commands::system_audio_allowed,
            commands::start_audio_check,
            commands::stop_audio_check,
            commands::list_meetings,
            commands::get_meeting,
            commands::rename_meeting,
            commands::move_meeting,
            commands::delete_meeting,
            commands::list_projects,
            commands::create_project,
            commands::rename_project,
            commands::delete_project,
            commands::list_resources,
            commands::upload_resource,
            commands::add_resource_text,
            commands::get_resource,
            commands::resource_content,
            commands::resource_limits,
            commands::delete_resource,
            commands::meeting_chats,
            commands::start_meeting_chat,
            commands::chat_messages,
            commands::delete_meeting_chat,
            commands::ask_in_chat,
            commands::session_state,
            commands::start_session,
            commands::switch_meeting_language,
            commands::stop_session,
            commands::generate,
            commands::finish_selection,
            commands::cancel_selection,
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
