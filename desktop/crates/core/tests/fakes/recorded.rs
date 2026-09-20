use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use cueline_core::{
    audio::{AudioFrame, AudioSource, SAMPLES_PER_FRAME},
    domain::Speaker,
    error::Result,
    session::AudioSources,
};
use tokio::sync::mpsc::Sender;

const CLIP: &[u8] = include_bytes!("../fixtures/meeting.pcm");

pub fn recorded_clip() -> Vec<i16> {
    CLIP.chunks_exact(2)
        .map(|pair| i16::from_le_bytes([pair[0], pair[1]]))
        .collect()
}

#[derive(Default)]
pub struct RecordedSources {
    stopped: Arc<AtomicUsize>,
}

impl RecordedSources {
    pub fn stopped(&self) -> usize {
        self.stopped.load(Ordering::SeqCst)
    }

    fn source(&self, speaker: Speaker) -> Box<dyn AudioSource> {
        Box::new(RecordedSource {
            speaker,
            stopped: Arc::clone(&self.stopped),
            sink: None,
        })
    }
}

impl AudioSources for RecordedSources {
    fn microphone(&self, _device_id: Option<String>) -> Box<dyn AudioSource> {
        self.source(Speaker::Me)
    }

    fn system_audio(&self) -> Option<Box<dyn AudioSource>> {
        Some(self.source(Speaker::Other))
    }
}

struct RecordedSource {
    speaker: Speaker,
    stopped: Arc<AtomicUsize>,
    sink: Option<Sender<AudioFrame>>,
}

impl AudioSource for RecordedSource {
    fn start(&mut self, sink: Sender<AudioFrame>) -> Result<()> {
        self.sink = Some(sink.clone());
        let speaker = self.speaker;

        tokio::spawn(async move {
            for chunk in recorded_clip().chunks(SAMPLES_PER_FRAME) {
                if sink
                    .send(AudioFrame::new(speaker, chunk.to_vec()))
                    .await
                    .is_err()
                {
                    return;
                }
            }
        });

        Ok(())
    }

    fn stop(&mut self) -> Result<()> {
        self.stopped.fetch_add(1, Ordering::SeqCst);
        self.sink = None;

        Ok(())
    }
}
