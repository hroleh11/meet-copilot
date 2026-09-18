use std::{sync::Arc, time::Duration};

use reqwest::{Method, RequestBuilder, Response, StatusCode};
use serde::{de::DeserializeOwned, Serialize};
use tokio::sync::Mutex;

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

pub struct Transport {
    endpoint: BackendEndpoint,
    http: reqwest::Client,
    credentials: Arc<CredentialHolder>,
    refreshing: Mutex<()>,
}

impl Transport {
    pub fn new(endpoint: BackendEndpoint, credentials: Arc<CredentialHolder>) -> Result<Self> {
        let http = reqwest::Client::builder()
            .timeout(JSON_TIMEOUT)
            .build()
            .map_err(transport_error)?;

        Ok(Self {
            endpoint,
            http,
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

    fn build(
        &self,
        method: Method,
        path: &str,
        body: Option<&impl Serialize>,
        token: Option<&Secret>,
    ) -> RequestBuilder {
        let mut request = self.http.request(method, self.endpoint.http(path));

        if let Some(token) = token {
            request = request.bearer_auth(token.expose());
        }

        match body {
            Some(payload) => request.json(payload),
            None => request,
        }
    }

    async fn dispatch(&self, request: RequestBuilder) -> Result<Response> {
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

async fn decode<T: DeserializeOwned>(response: Response) -> Result<T> {
    if !response.status().is_success() {
        return Err(into_error(response).await);
    }

    response.json::<T>().await.map_err(decode_error)
}
