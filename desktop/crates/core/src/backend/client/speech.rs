use async_trait::async_trait;
use futures_util::{
    stream::{SplitSink, SplitStream},
    SinkExt, StreamExt,
};
use tokio::net::TcpStream;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};

use crate::{
    audio::AudioFrame,
    backend::stt::{SttEvent, SttEvents, SttMessage, SttSink},
    error::{Error, Result},
};

type Socket = WebSocketStream<MaybeTlsStream<TcpStream>>;

const FINISH_REQUEST: &str = r#"{"type":"finish"}"#;
const NORMAL_CLOSE: u16 = 1000;

pub struct WebSocketSink(SplitSink<Socket, Message>);

pub struct WebSocketEvents(SplitStream<Socket>);

pub async fn connect(url: &str) -> Result<(WebSocketSink, WebSocketEvents)> {
    let (socket, _) = connect_async(url).await.map_err(handshake_error)?;
    let (sink, events) = socket.split();

    Ok((WebSocketSink(sink), WebSocketEvents(events)))
}

#[async_trait]
impl SttSink for WebSocketSink {
    async fn send(&mut self, frame: &AudioFrame) -> Result<()> {
        self.0
            .send(Message::Binary(frame.to_le_bytes().into()))
            .await
            .map_err(|error| Error::unreachable(format!("the speech stream dropped: {error}")))
    }

    async fn close(&mut self) -> Result<()> {
        let _ = self.0.send(Message::text(FINISH_REQUEST)).await;

        Ok(())
    }
}

#[async_trait]
impl SttEvents for WebSocketEvents {
    async fn next(&mut self) -> Option<SttEvent> {
        loop {
            match self.0.next().await? {
                Ok(Message::Text(text)) => {
                    if let Ok(message) = serde_json::from_str::<SttMessage>(&text) {
                        return Some(SttEvent::from(message));
                    }
                }
                Ok(Message::Close(frame)) => return closed(frame),
                Ok(_) => continue,
                Err(error) => {
                    return Some(SttEvent::Failed {
                        message: format!("The speech stream dropped: {error}"),
                    })
                }
            }
        }
    }
}

fn closed(frame: Option<tokio_tungstenite::tungstenite::protocol::CloseFrame>) -> Option<SttEvent> {
    let frame = frame?;
    let code: u16 = frame.code.into();

    if code == NORMAL_CLOSE {
        return None;
    }

    Some(SttEvent::Failed {
        message: Error::from_close_code(code, Some(frame.reason.to_string())).to_string(),
    })
}

fn handshake_error(error: tokio_tungstenite::tungstenite::Error) -> Error {
    use tokio_tungstenite::tungstenite::Error as WsError;

    match error {
        WsError::Http(response) => Error::from_http_status(response.status().as_u16(), None),
        other => Error::unreachable(other),
    }
}
