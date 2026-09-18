use std::time::{Duration, Instant};

use meet_copilot_core::{
    audio::{AudioFrame, AudioSource, MicrophoneSource},
    domain::Speaker,
    error::Result,
};
use tokio::{sync::mpsc, task::JoinHandle};

use crate::{app::Emitter, events::AudioLevelEvent};

const RAW_FRAME_CHANNEL_CAPACITY: usize = 32;
const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(100);

pub struct MicrophoneTest {
    source: Box<dyn AudioSource>,
    consumer: JoinHandle<()>,
}

impl MicrophoneTest {
    pub fn start(device_id: Option<String>, emitter: Emitter) -> Result<Self> {
        let mut source = MicrophoneSource::new(device_id);
        let (tx, rx) = mpsc::channel::<AudioFrame>(RAW_FRAME_CHANNEL_CAPACITY);

        source.start(tx)?;

        Ok(Self {
            source: Box::new(source),
            consumer: tokio::spawn(emit_levels(rx, emitter)),
        })
    }

    pub fn stop(mut self) -> Result<()> {
        self.consumer.abort();
        self.source.stop()
    }
}

async fn emit_levels(mut frames: mpsc::Receiver<AudioFrame>, emitter: Emitter) {
    let mut last_emit = Instant::now() - LEVEL_EMIT_INTERVAL;

    while let Some(frame) = frames.recv().await {
        if last_emit.elapsed() < LEVEL_EMIT_INTERVAL {
            continue;
        }

        last_emit = Instant::now();
        emitter.audio_level(AudioLevelEvent {
            speaker: Speaker::Me,
            level: frame.level(),
        });
    }
}
