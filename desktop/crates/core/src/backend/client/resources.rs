use reqwest::{
    multipart::{Form, Part},
    Method,
};
use serde::Serialize;

use crate::{
    domain::{
        NewResourceFile, Resource, ResourceContent, ResourceId, ResourceLimits, ResourceScope,
    },
    error::Result,
};

use super::{failure::transport_error, transport::Transport};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TextBody<'a> {
    scope: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    project_id: Option<&'a str>,
    name: &'a str,
    text: &'a str,
}

pub async fn list(transport: &Transport, scope: &ResourceScope) -> Result<Vec<Resource>> {
    let mut path = format!("resources?scope={}", level(scope));

    match scope {
        ResourceScope::User => {}
        ResourceScope::Project(project) => path.push_str(&format!("&projectId={project}")),
        ResourceScope::Meeting(Some(meeting)) => path.push_str(&format!("&meetingId={meeting}")),
        ResourceScope::Meeting(None) => {}
    }

    transport.authorized(Method::GET, &path, None::<&()>).await
}

pub async fn upload(
    transport: &Transport,
    scope: &ResourceScope,
    file: &NewResourceFile,
) -> Result<Resource> {
    transport
        .authorized_form(Method::POST, "resources", || upload_form(scope, file))
        .await
}

fn upload_form(scope: &ResourceScope, file: &NewResourceFile) -> Result<Form> {
    let part = Part::bytes(file.bytes.clone())
        .file_name(file.name.clone())
        .mime_str(&file.mime_type)
        .map_err(transport_error)?;

    let form = Form::new()
        .text("scope", level(scope))
        .text("name", file.name.clone())
        .part("file", part);

    Ok(match scope {
        ResourceScope::Project(project) => form.text("projectId", project.clone()),
        _ => form,
    })
}

pub async fn add_text(
    transport: &Transport,
    scope: &ResourceScope,
    name: &str,
    text: &str,
) -> Result<Resource> {
    let project = match scope {
        ResourceScope::Project(project) => Some(project.as_str()),
        _ => None,
    };

    transport
        .authorized(
            Method::POST,
            "resources/text",
            Some(&TextBody {
                scope: level(scope),
                project_id: project,
                name,
                text,
            }),
        )
        .await
}

pub async fn get(transport: &Transport, id: &ResourceId) -> Result<Resource> {
    transport
        .authorized(Method::GET, &format!("resources/{id}"), None::<&()>)
        .await
}

pub async fn content(transport: &Transport, id: &ResourceId) -> Result<ResourceContent> {
    transport
        .authorized(Method::GET, &format!("resources/{id}/content"), None::<&()>)
        .await
}

pub async fn limits(transport: &Transport) -> Result<ResourceLimits> {
    transport
        .authorized(Method::GET, "resources/limits", None::<&()>)
        .await
}

pub async fn delete(transport: &Transport, id: &ResourceId) -> Result<()> {
    let _: serde_json::Value = transport
        .authorized(Method::DELETE, &format!("resources/{id}"), None::<&()>)
        .await?;

    Ok(())
}

fn level(scope: &ResourceScope) -> &'static str {
    match scope {
        ResourceScope::User => "user",
        ResourceScope::Project(_) => "project",
        ResourceScope::Meeting(_) => "meeting",
    }
}
