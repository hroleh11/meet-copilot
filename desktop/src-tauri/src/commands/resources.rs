use std::path::Path;

use cueline_core::{
    backend::BackendApi,
    domain::{
        resource_mime_type, NewResourceFile, Resource, ResourceContent, ResourceId, ResourceLimits,
        ResourceScope,
    },
    Error,
};
use tauri::State;

use crate::{app::AppState, command_error::CommandError};

#[tauri::command]
pub async fn list_resources(
    scope: ResourceScope,
    state: State<'_, AppState>,
) -> Result<Vec<Resource>, CommandError> {
    Ok(state.backend().await.list_resources(&scope).await?)
}

#[tauri::command]
pub async fn upload_resource(
    scope: ResourceScope,
    path: String,
    state: State<'_, AppState>,
) -> Result<Resource, CommandError> {
    let file = read_file(&path)?;

    Ok(state.backend().await.upload_resource(&scope, &file).await?)
}

#[tauri::command]
pub async fn add_resource_text(
    scope: ResourceScope,
    name: String,
    text: String,
    state: State<'_, AppState>,
) -> Result<Resource, CommandError> {
    Ok(state
        .backend()
        .await
        .add_resource_text(&scope, &name, &text)
        .await?)
}

#[tauri::command]
pub async fn get_resource(
    id: ResourceId,
    state: State<'_, AppState>,
) -> Result<Resource, CommandError> {
    Ok(state.backend().await.resource(&id).await?)
}

#[tauri::command]
pub async fn resource_content(
    id: ResourceId,
    state: State<'_, AppState>,
) -> Result<ResourceContent, CommandError> {
    Ok(state.backend().await.resource_content(&id).await?)
}

#[tauri::command]
pub async fn resource_limits(state: State<'_, AppState>) -> Result<ResourceLimits, CommandError> {
    Ok(state.backend().await.resource_limits().await?)
}

#[tauri::command]
pub async fn delete_resource(
    id: ResourceId,
    state: State<'_, AppState>,
) -> Result<(), CommandError> {
    Ok(state.backend().await.delete_resource(&id).await?)
}

fn read_file(path: &str) -> Result<NewResourceFile, Error> {
    let name = Path::new(path)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| Error::Resource(format!("{path} has no file name")))?
        .to_owned();

    let mime_type = resource_mime_type(&name)
        .ok_or_else(|| Error::Resource(format!("{name} is not a PDF, Markdown or text file")))?
        .to_owned();

    let bytes = std::fs::read(path).map_err(|error| Error::Resource(format!("{name}: {error}")))?;

    Ok(NewResourceFile {
        name,
        mime_type,
        bytes,
    })
}
