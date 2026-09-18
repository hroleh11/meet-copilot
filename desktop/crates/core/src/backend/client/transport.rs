use std::{sync::Arc, time::Duration};

use reqwest::{Method, RequestBuilder, Response, StatusCode};
use serde::{de::DeserializeOwned, Serialize};
use tokio::{sync::Mutex, time::sleep};

use crate::{
    backend::endpoint::{BackendEndpoint, Tokens},
    error::Result,
    secret::Secret,
};

use super::{
    credentials::CredentialHolder,
    failure::{decode_error, expect_signed_in, into_error, transport_error},
};

const JSON_TIMEOUT: Duration = Duration::from_secs(10);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const SEND_ATTEMPTS: u32 = 3;
const RETRY_BASE_DELAY: Duration = Duration::from_millis(300);

pub struct Transport {
    endpoint: BackendEndpoint,
    http: reqwest::Client,
    streaming: reqwest::Client,
    credentials: Arc<CredentialHolder>,
    refreshing: Mutex<()>,
}

impl Transport {
    pub fn new(endpoint: BackendEndpoint, credentials: Arc<CredentialHolder>) -> Result<Self> {
        let http = reqwest::Client::builder()
            .timeout(JSON_TIMEOUT)
            .build()
            .map_err(transport_error)?;

        let streaming = reqwest::Client::builder()
            .connect_timeout(CONNECT_TIMEOUT)
            .build()
            .map_err(transport_error)?;

        Ok(Self {
            endpoint,
            http,
            streaming,
            credentials,
            refreshing: Mutex::new(()),
        })
    }

    pub fn endpoint(&self) -> &BackendEndpoint {
        &self.endpoint
    }

    pub fn credentials(&self) -> &CredentialHolder {
        &self.credentials
    }

    pub async fn public<T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
    ) -> Result<T> {
        let response = self.dispatch(self.build(method, path, body, None)).await?;

        decode(response).await
    }

    pub async fn authorized<T: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
    ) -> Result<T> {
        let token = expect_signed_in(self.credentials.current().await)?.access;
        let response = self
            .dispatch(self.build(method.clone(), path, body, Some(&token)))
            .await?;

        if response.status() != StatusCode::UNAUTHORIZED {
            return decode(response).await;
        }

        self.refresh(&token).await?;

        let renewed = expect_signed_in(self.credentials.current().await)?.access;
        let retried = self
            .dispatch(self.build(method, path, body, Some(&renewed)))
            .await?;

        decode(retried).await
    }

    pub async fn authorized_stream(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
    ) -> Result<Response> {
        let token = expect_signed_in(self.credentials.current().await)?.access;
        let opened = self
            .dispatch(self.build_on(&self.streaming, method.clone(), path, body, Some(&token)))
            .await?;

        if opened.status() != StatusCode::UNAUTHORIZED {
            return accept(opened).await;
        }

        self.refresh(&token).await?;

        let renewed = expect_signed_in(self.credentials.current().await)?.access;
        let retried = self
            .dispatch(self.build_on(&self.streaming, method, path, body, Some(&renewed)))
            .await?;

        accept(retried).await
    }

    fn build(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
        token: Option<&Secret>,
    ) -> RequestBuilder {
        self.build_on(&self.http, method, path, body, token)
    }

    fn build_on(
        &self,
        client: &reqwest::Client,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
        token: Option<&Secret>,
    ) -> RequestBuilder {
        let mut request = client.request(method, self.endpoint.http(path));

        if let Some(token) = token {
            request = request.bearer_auth(token.expose());
        }

        match body {
            Some(payload) => request.json(payload),
            None => request,
        }
    }

    async fn dispatch(&self, request: RequestBuilder) -> Result<Response> {
        for attempt in 1..SEND_ATTEMPTS {
            let Some(probe) = request.try_clone() else {
                break;
            };

            match probe.send().await {
                Ok(response) if !is_retryable_status(response.status()) => return Ok(response),
                Err(error) if !is_retryable_error(&error) => return Err(transport_error(error)),
                _ => {}
            }

            sleep(RETRY_BASE_DELAY * 2_u32.saturating_pow(attempt - 1)).await;
        }

        request.send().await.map_err(transport_error)
    }

    async fn refresh(&self, stale: &Secret) -> Result<()> {
        let _guard = self.refreshing.lock().await;

        let current = expect_signed_in(self.credentials.current().await)?;

        if current.access.expose() != stale.expose() {
            return Ok(());
        }

        let body = serde_json::json!({ "refreshToken": current.refresh.expose() });
        let response = self
            .dispatch(self.build(Method::POST, "auth/refresh", Some(&body), None))
            .await?;

        if !response.status().is_success() {
            self.credentials.clear().await?;
            return Err(into_error(response).await);
        }

        let tokens: Tokens = decode(response).await?;

        self.credentials.store(&tokens).await
    }
}

fn is_retryable_status(status: StatusCode) -> bool {
    status.is_server_error() && status != StatusCode::NOT_IMPLEMENTED
}

fn is_retryable_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}

async fn accept(response: Response) -> Result<Response> {
    if response.status().is_success() {
        return Ok(response);
    }

    Err(into_error(response).await)
}

async fn decode<T: DeserializeOwned>(response: Response) -> Result<T> {
    if !response.status().is_success() {
        return Err(into_error(response).await);
    }

    response.json::<T>().await.map_err(decode_error)
}
