use std::sync::Arc;

use async_trait::async_trait;
use reqwest::Method;
use serde::Serialize;

use crate::{
    backend::{
        api::BackendApi,
        chat::{ChatId, ChatMessage, ChatSession, ChatStream},
        endpoint::{BackendEndpoint, Health, Tokens},
        generate::DeltaStream,
        stt::{SttGateway, SttLane},
    },
    backend_failure::BackendFailure,
    domain::{
        GenerationMode, Language, Meeting, MeetingDetails, MeetingId, MeetingProfile, Profile,
        Speaker, UserSettings,
    },
    error::{Error, Result},
    screenshot::Screenshot,
    settings::SecretStore,
};

use super::{
    chat, credentials::CredentialHolder, generation, query::escaped, speech, transport::Transport,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateMeetingBody {
    profile: MeetingProfile,
    language: Language,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeBody<'a> {
    code: &'a str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SignInBody<'a> {
    email: &'a str,
    password: &'a str,
}

pub struct BackendClient {
    transport: Arc<Transport>,
}

impl BackendClient {
    pub fn new(endpoint: BackendEndpoint, secrets: Arc<dyn SecretStore>) -> Result<Self> {
        let credentials = Arc::new(CredentialHolder::load(secrets)?);

        Ok(Self {
            transport: Arc::new(Transport::new(endpoint, credentials)?),
        })
    }

    pub fn transport(&self) -> Arc<Transport> {
        Arc::clone(&self.transport)
    }

    pub async fn is_signed_in(&self) -> bool {
        self.transport.credentials().is_signed_in().await
    }

    pub async fn sign_out(&self) -> Result<()> {
        let result: Result<serde_json::Value> = self
            .transport
            .authorized(Method::POST, "auth/logout", None::<&()>)
            .await;

        self.transport.credentials().clear().await?;
        result.map(|_| ())
    }
}

#[async_trait]
impl BackendApi for BackendClient {
    async fn health(&self) -> Result<Health> {
        self.transport
            .public(Method::GET, "health", None::<&()>)
            .await
    }

    async fn sign_in(&self, email: &str, password: &str) -> Result<Tokens> {
        let tokens: Tokens = self
            .transport
            .public(
                Method::POST,
                "auth/login",
                Some(&SignInBody { email, password }),
            )
            .await?;

        self.transport.credentials().store(&tokens).await?;

        Ok(tokens)
    }

    async fn exchange_code(&self, code: &str) -> Result<Tokens> {
        let tokens: Tokens = self
            .transport
            .public(Method::POST, "auth/exchange", Some(&ExchangeBody { code }))
            .await?;

        self.transport.credentials().store(&tokens).await?;

        Ok(tokens)
    }

    async fn me(&self) -> Result<Profile> {
        self.transport
            .authorized(Method::GET, "users/me", None::<&()>)
            .await
    }

    async fn user_settings(&self) -> Result<UserSettings> {
        self.transport
            .authorized(Method::GET, "settings", None::<&()>)
            .await
    }

    async fn save_user_settings(&self, settings: &UserSettings) -> Result<UserSettings> {
        self.transport
            .authorized(Method::PUT, "settings", Some(settings))
            .await
    }

    async fn create_meeting(&self, profile: MeetingProfile, language: Language) -> Result<Meeting> {
        self.transport
            .authorized(
                Method::POST,
                "meetings",
                Some(&CreateMeetingBody { profile, language }),
            )
            .await
    }

    async fn finish_meeting(&self, id: &MeetingId) -> Result<Meeting> {
        self.transport
            .authorized(Method::POST, &format!("meetings/{id}/finish"), None::<&()>)
            .await
    }

    async fn list_meetings(&self, limit: u32, cursor: Option<&str>) -> Result<Vec<Meeting>> {
        let path = match cursor {
            Some(cursor) => format!("meetings?limit={limit}&cursor={cursor}"),
            None => format!("meetings?limit={limit}"),
        };

        self.transport
            .authorized(Method::GET, &path, None::<&()>)
            .await
    }

    async fn meeting(&self, id: &MeetingId) -> Result<MeetingDetails> {
        self.transport
            .authorized(Method::GET, &format!("meetings/{id}"), None::<&()>)
            .await
    }

    fn generate(
        &self,
        id: &MeetingId,
        mode: GenerationMode,
        screenshot: Option<&Screenshot>,
    ) -> DeltaStream<'_> {
        generation::generate(self.transport(), id, mode, screenshot)
    }

    async fn meeting_chats(&self, id: &MeetingId, query: Option<&str>) -> Result<Vec<ChatSession>> {
        let path = match query.map(escaped).filter(|query| !query.is_empty()) {
            Some(query) => format!("meetings/{id}/chats?query={query}"),
            None => format!("meetings/{id}/chats"),
        };

        self.transport
            .authorized(Method::GET, &path, None::<&()>)
            .await
    }

    async fn start_meeting_chat(&self, id: &MeetingId) -> Result<ChatSession> {
        self.transport
            .authorized(Method::POST, &format!("meetings/{id}/chats"), None::<&()>)
            .await
    }

    async fn chat_messages(&self, id: &MeetingId, chat: &ChatId) -> Result<Vec<ChatMessage>> {
        self.transport
            .authorized(
                Method::GET,
                &format!("meetings/{id}/chats/{chat}"),
                None::<&()>,
            )
            .await
    }

    async fn delete_meeting_chat(&self, id: &MeetingId, chat: &ChatId) -> Result<()> {
        let _: serde_json::Value = self
            .transport
            .authorized(
                Method::DELETE,
                &format!("meetings/{id}/chats/{chat}"),
                None::<&()>,
            )
            .await?;

        Ok(())
    }

    fn ask_in_chat(&self, id: &MeetingId, chat: &ChatId, question: &str) -> ChatStream<'_> {
        chat::ask(self.transport(), id, chat, question)
    }
}

#[async_trait]
impl SttGateway for BackendClient {
    async fn open(&self, meeting_id: &MeetingId, speaker: Speaker) -> Result<SttLane> {
        let token = self
            .transport
            .credentials()
            .current()
            .await
            .ok_or_else(|| Error::backend(BackendFailure::Unauthorized, None))?
            .access;

        let url = self.transport.endpoint().websocket(
            &format!("meetings/{meeting_id}/stt"),
            &format!(
                "speaker={}&token={}",
                speaker.as_query_value(),
                token.expose()
            ),
        );

        let (sink, events) = speech::connect(&url).await?;

        Ok((Box::new(sink), Box::new(events)))
    }
}
