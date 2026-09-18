use std::sync::Arc;

use futures_util::StreamExt;
use tokio::sync::mpsc::Sender;
use tokio_util::sync::CancellationToken;

use crate::{
    access::AccessPolicy,
    backend::{BackendApi, Delta},
    domain::{GenerationMode, MeetingId},
    error::{Error, Result},
    generation::event::GenerationEvent,
};

pub struct GenerationDeps {
    pub backend: Arc<dyn BackendApi>,
    pub access: Arc<dyn AccessPolicy>,
}

pub struct Generator {
    deps: GenerationDeps,
    current: Option<CancellationToken>,
}

impl Generator {
    pub fn new(deps: GenerationDeps) -> Self {
        Self {
            deps,
            current: None,
        }
    }

    pub async fn start(
        &mut self,
        meeting_id: MeetingId,
        mode: GenerationMode,
        events: Sender<GenerationEvent>,
    ) -> Result<()> {
        self.cancel();

        if !self.deps.access.check().await?.is_allowed() {
            return Err(Error::Access(
                "This account cannot ask for answers right now".to_owned(),
            ));
        }

        let cancel = CancellationToken::new();
        self.current = Some(cancel.clone());

        let backend = Arc::clone(&self.deps.backend);

        tokio::spawn(async move {
            if events
                .send(GenerationEvent::Started { mode })
                .await
                .is_err()
            {
                return;
            }

            let outcome = collect(backend, &meeting_id, mode, &events, cancel).await;

            if let Some(event) = outcome {
                let _ = events.send(event).await;
            }
        });

        Ok(())
    }

    pub fn cancel(&mut self) {
        if let Some(cancel) = self.current.take() {
            cancel.cancel();
        }
    }
}

async fn collect(
    backend: Arc<dyn BackendApi>,
    meeting_id: &MeetingId,
    mode: GenerationMode,
    events: &Sender<GenerationEvent>,
    cancel: CancellationToken,
) -> Option<GenerationEvent> {
    let mut deltas = backend.generate(meeting_id, mode);

    loop {
        let delta = tokio::select! {
            _ = cancel.cancelled() => return None,
            delta = deltas.next() => delta,
        };

        match delta {
            None => {
                return Some(GenerationEvent::Failed {
                    message: "The answer stopped before it was finished".to_owned(),
                })
            }
            Some(Err(error)) => {
                return Some(GenerationEvent::Failed {
                    message: error.to_string(),
                })
            }
            Some(Ok(Delta::Done {
                generation_id,
                usage,
                ..
            })) => {
                return Some(GenerationEvent::Finished {
                    generation_id,
                    usage,
                })
            }
            Some(Ok(Delta::Text(text))) => {
                if events.send(GenerationEvent::Delta { text }).await.is_err() {
                    return None;
                }
            }
        }
    }
}
