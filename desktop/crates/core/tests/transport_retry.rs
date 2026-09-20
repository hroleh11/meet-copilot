mod fakes;

use std::{sync::Arc, time::Duration};

use cueline_core::{
    backend::{BackendApi, BackendClient, BackendEndpoint},
    backend_failure::BackendFailure,
    error::Error,
};
use fakes::EmptySecrets;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    task::JoinHandle,
    time::timeout,
};

const HEALTHY_BODY: &str = r#"{"status":"ok","postgres":"up","redis":"up"}"#;
const CALL_TIMEOUT: Duration = Duration::from_secs(10);

async fn serve(answers: Vec<String>) -> (String, JoinHandle<usize>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.expect("a free port");
    let address = listener.local_addr().expect("an address");

    let handle = tokio::spawn(async move {
        let mut served = 0;

        for answer in answers {
            let Ok((stream, _)) = listener.accept().await else {
                break;
            };

            answer_once(stream, &answer).await;
            served += 1;
        }

        served
    });

    (format!("http://{address}"), handle)
}

async fn answer_once(mut stream: TcpStream, answer: &str) {
    let mut request = [0_u8; 1024];
    let _ = stream.read(&mut request).await;
    let _ = stream.write_all(answer.as_bytes()).await;
    let _ = stream.flush().await;
    let _ = stream.shutdown().await;
}

fn response(status: &str, body: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        body.len()
    )
}

fn client(base_url: &str) -> BackendClient {
    BackendClient::new(BackendEndpoint::new(base_url), Arc::new(EmptySecrets)).expect("a client")
}

#[tokio::test]
async fn a_server_that_stumbles_once_is_asked_again() {
    let (base_url, server) = serve(vec![
        response("503 Service Unavailable", "{}"),
        response("200 OK", HEALTHY_BODY),
    ])
    .await;

    let health = timeout(CALL_TIMEOUT, client(&base_url).health())
        .await
        .expect("the call finishes")
        .expect("the retry succeeds");

    assert_eq!(health.status, "ok");
    assert_eq!(server.await.expect("the server stops"), 2);
}

#[tokio::test]
async fn a_server_that_stays_down_gives_up_and_says_so() {
    let unavailable = response("503 Service Unavailable", "{}");
    let (base_url, server) =
        serve(vec![unavailable.clone(), unavailable.clone(), unavailable]).await;

    let failure = timeout(CALL_TIMEOUT, client(&base_url).health())
        .await
        .expect("the call finishes")
        .expect_err("the server never recovers");

    assert!(matches!(
        failure,
        Error::Backend {
            failure: BackendFailure::Unavailable,
            ..
        }
    ));
    assert_eq!(server.await.expect("the server stops"), 3);
}

#[tokio::test]
async fn a_refusal_from_the_server_is_not_retried() {
    let (base_url, server) = serve(vec![response("404 Not Found", r#"{"message":"nope"}"#)]).await;

    let failure = timeout(CALL_TIMEOUT, client(&base_url).health())
        .await
        .expect("the call finishes")
        .expect_err("the server refuses");

    assert!(matches!(
        failure,
        Error::Backend {
            failure: BackendFailure::NotFound,
            ..
        }
    ));
    assert_eq!(server.await.expect("the server stops"), 1);
}
