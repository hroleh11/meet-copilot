use cueline_core::{
    backend::BackendApi,
    domain::{Project, ProjectId},
};
use tauri::State;

use crate::{app::AppState, command_error::CommandError};

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, CommandError> {
    Ok(state.backend().await.list_projects().await?)
}

#[tauri::command]
pub async fn create_project(
    name: String,
    state: State<'_, AppState>,
) -> Result<Project, CommandError> {
    Ok(state.backend().await.create_project(&name).await?)
}

#[tauri::command]
pub async fn rename_project(
    id: ProjectId,
    name: String,
    state: State<'_, AppState>,
) -> Result<Project, CommandError> {
    Ok(state.backend().await.rename_project(&id, &name).await?)
}

#[tauri::command]
pub async fn delete_project(id: ProjectId, state: State<'_, AppState>) -> Result<(), CommandError> {
    Ok(state.backend().await.delete_project(&id).await?)
}
