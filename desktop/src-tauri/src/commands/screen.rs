use crate::app::selection::{self, SelectionRect};

#[tauri::command]
pub fn finish_selection(rect: SelectionRect) {
    selection::deliver(Some(rect));
}

#[tauri::command]
pub fn cancel_selection() {
    selection::deliver(None);
}
