use reqwest::Method;
use serde::Serialize;

use crate::{
    domain::{Project, ProjectId},
    error::Result,
};

use super::transport::Transport;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NameBody<'a> {
    name: &'a str,
}

pub async fn list(transport: &Transport) -> Result<Vec<Project>> {
    transport
        .authorized(Method::GET, "projects", None::<&()>)
        .await
}

pub async fn create(transport: &Transport, name: &str) -> Result<Project> {
    transport
        .authorized(Method::POST, "projects", Some(&NameBody { name }))
        .await
}

pub async fn rename(transport: &Transport, id: &ProjectId, name: &str) -> Result<Project> {
    transport
        .authorized(
            Method::PATCH,
            &format!("projects/{id}"),
            Some(&NameBody { name }),
        )
        .await
}

pub async fn delete(transport: &Transport, id: &ProjectId) -> Result<()> {
    let _: serde_json::Value = transport
        .authorized(Method::DELETE, &format!("projects/{id}"), None::<&()>)
        .await?;

    Ok(())
}
