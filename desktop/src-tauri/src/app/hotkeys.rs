use meet_copilot_core::{domain::GenerationMode, settings::Hotkeys};
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{
    app::{answers, overlay, Emitter},
    command_error::CommandError,
};

#[derive(Debug, Clone, Copy)]
enum Action {
    Ask(GenerationMode),
    ToggleOverlay,
}

pub fn register(app: &AppHandle, hotkeys: &Hotkeys) {
    if let Err(error) = app.global_shortcut().unregister_all() {
        eprintln!("could not release the previous hotkeys: {error}");
    }

    bind(app, &hotkeys.reply, Action::Ask(GenerationMode::Reply));
    bind(
        app,
        &hotkeys.alternative,
        Action::Ask(GenerationMode::Alternative),
    );
    bind(app, &hotkeys.hide, Action::ToggleOverlay);
}

fn bind(app: &AppHandle, shortcut: &str, action: Action) {
    let registered = app
        .global_shortcut()
        .on_shortcut(shortcut, move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                run(app.clone(), action);
            }
        });

    if let Err(error) = registered {
        eprintln!("could not register the hotkey {shortcut}: {error}");
    }
}

fn run(app: AppHandle, action: Action) {
    match action {
        Action::ToggleOverlay => overlay::toggle(&app),
        Action::Ask(mode) => {
            tauri::async_runtime::spawn(async move {
                if let Err(error) = answers::ask(&app, mode).await {
                    Emitter::new(app.clone()).app_error(CommandError::from(error).into());
                }
            });
        }
    }
}
