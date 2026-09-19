use async_trait::async_trait;

use crate::{
    domain::{
        GenerationMode, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile, Profile,
        UserSettings,
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

    async fn create_meeting(&self, profile: MeetingProfile, language: Language) -> Result<Meeting>;

    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting>;

    async fn list_meetings(&self, limit: u32, cursor: Option<&str>) -> Result<Vec<Meeting>>;

    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails>;

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
