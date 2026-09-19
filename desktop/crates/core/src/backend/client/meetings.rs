use reqwest::Method;
use serde::Serialize;

use crate::{
    domain::{Meeting, MeetingDetails, MeetingId, MeetingScope, MeetingStart, ProjectId},
    error::Result,
};

use super::transport::Transport;

const MEETINGS_OUTSIDE_PROJECTS: &str = "none";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RenameBody<'a> {
    title: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MoveBody<'a> {
    project_id: Option<&'a ProjectId>,
}

pub async fn create(transport: &Transport, start: &MeetingStart) -> Result<Meeting> {
    transport
        .authorized(Method::POST, "meetings", Some(start))
        .await
}

pub async fn finish(transport: &Transport, id: &MeetingId) -> Result<Meeting> {
    transport
        .authorized(Method::POST, &format!("meetings/{id}/finish"), None::<&()>)
        .await
}

pub async fn list(
    transport: &Transport,
    limit: u32,
    cursor: Option<&str>,
    scope: &MeetingScope,
) -> Result<Vec<Meeting>> {
    let mut path = format!("meetings?limit={limit}");

    if let Some(cursor) = cursor {
        path.push_str(&format!("&cursor={cursor}"));
    }

    match scope {
        MeetingScope::All => {}
        MeetingScope::Outside => {
            path.push_str(&format!("&projectId={MEETINGS_OUTSIDE_PROJECTS}"));
        }
        MeetingScope::Project(project) => path.push_str(&format!("&projectId={project}")),
    }

    transport.authorized(Method::GET, &path, None::<&()>).await
}

pub async fn details(transport: &Transport, id: &MeetingId) -> Result<MeetingDetails> {
    transport
        .authorized(Method::GET, &format!("meetings/{id}"), None::<&()>)
        .await
}

pub async fn rename(transport: &Transport, id: &MeetingId, title: &str) -> Result<Meeting> {
    transport
        .authorized(
            Method::PATCH,
            &format!("meetings/{id}"),
            Some(&RenameBody { title }),
        )
        .await
}

pub async fn move_to(
    transport: &Transport,
    id: &MeetingId,
    project: Option<&ProjectId>,
) -> Result<Meeting> {
    transport
        .authorized(
            Method::PATCH,
            &format!("meetings/{id}"),
            Some(&MoveBody {
                project_id: project,
            }),
        )
        .await
}

pub async fn delete(transport: &Transport, id: &MeetingId) -> Result<()> {
    let _: serde_json::Value = transport
        .authorized(Method::DELETE, &format!("meetings/{id}"), None::<&()>)
        .await?;

    Ok(())
}
