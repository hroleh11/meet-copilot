use async_trait::async_trait;

use crate::{
    domain::{
        GenerationMode, Meeting, MeetingDetails, MeetingId, MeetingScope, MeetingStart,
        NewResourceFile, Profile, Project, ProjectId, Resource, ResourceContent, ResourceId,
        ResourceLimits, ResourceScope, UserSettings,
    },
    error::Result,
    screenshot::Screenshot,
};

use super::{
    chat::{ChatId, ChatMessage, ChatSession, ChatStream},
    endpoint::{Health, Tokens},
    generate::DeltaStream,
};

#[async_trait]
pub trait BackendApi: Send + Sync {
    async fn health(&self) -> Result<Health>;

    async fn sign_in(&self, email: &str, password: &str) -> Result<Tokens>;

    async fn exchange_code(&self, code: &str) -> Result<Tokens>;

    async fn me(&self) -> Result<Profile>;

    async fn user_settings(&self) -> Result<UserSettings>;

    async fn save_user_settings(&self, settings: &UserSettings) -> Result<UserSettings>;

    async fn create_meeting(&self, start: &MeetingStart) -> Result<Meeting>;

    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;

    async fn list_meetings(
        &self,
        limit: u32,
        cursor: Option<&str>,
        scope: &MeetingScope,
    ) -> Result<Vec<Meeting>>;

    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;

    async fn rename_meeting(&self, id: &MeetingId, title: &str) -> Result<Meeting>;

    async fn move_meeting(&self, id: &MeetingId, project: Option<&ProjectId>) -> Result<Meeting>;

    async fn delete_meeting(&self, id: &MeetingId) -> Result<()>;

    async fn list_resources(&self, scope: &ResourceScope) -> Result<Vec<Resource>>;

    async fn upload_resource(
        &self,
        scope: &ResourceScope,
        file: &NewResourceFile,
    ) -> Result<Resource>;

    async fn add_resource_text(
        &self,
        scope: &ResourceScope,
        name: &str,
        text: &str,
    ) -> Result<Resource>;

    async fn resource(&self, id: &ResourceId) -> Result<Resource>;

    async fn resource_content(&self, id: &ResourceId) -> Result<ResourceContent>;

    async fn resource_limits(&self) -> Result<ResourceLimits>;

    async fn delete_resource(&self, id: &ResourceId) -> Result<()>;

    async fn list_projects(&self) -> Result<Vec<Project>>;

    async fn create_project(&self, name: &str) -> Result<Project>;

    async fn rename_project(&self, id: &ProjectId, name: &str) -> Result<Project>;

    async fn delete_project(&self, id: &ProjectId) -> Result<()>;

    fn generate(
        &self,
        id: &MeetingId,
        mode: GenerationMode,
        screenshot: Option<&Screenshot>,
    ) -> DeltaStream<'_>;

    async fn meeting_chats(&self, id: &MeetingId, query: Option<&str>) -> Result<Vec<ChatSession>>;

    async fn start_meeting_chat(&self, id: &MeetingId) -> Result<ChatSession>;

    async fn chat_messages(&self, id: &MeetingId, chat: &ChatId) -> Result<Vec<ChatMessage>>;

    async fn delete_meeting_chat(&self, id: &MeetingId, chat: &ChatId) -> Result<()>;

    fn ask_in_chat(&self, id: &MeetingId, chat: &ChatId, question: &str) -> ChatStream<'_>;
}
