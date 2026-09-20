use std::{
    collections::HashMap,
    time::{Duration, Instant},
};

use cueline_core::{
    audio::{AudioFrame, AudioSource, MicrophoneSource},
    domain::Speaker,
    error::Result,
};
use serde::Serialize;
use tokio::{sync::mpsc, task::JoinHandle};

use crate::{app::Emitter, events::AudioLevelEvent};

const FRAME_CHANNEL_CAPACITY: usize = 64;
const LEVEL_EMIT_INTERVAL: Duration = Duration::from_millis(100);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioCheckStatus {
    pub system_audio_problem: Option<String>,
}

pub struct AudioCheck {
    sources: Vec<Box<dyn AudioSource>>,
    consumer: JoinHandle<()>,
}

impl AudioCheck {
    pub fn start(device_id: Option<String>, emitter: Emitter) -> Result<(Self, AudioCheckStatus)> {
        let (frames, incoming) = mpsc::channel::<AudioFrame>(FRAME_CHANNEL_CAPACITY);
        let mut sources: Vec<Box<dyn AudioSource>> = Vec::new();

        let mut microphone = MicrophoneSource::new(device_id);
        microphone.start(frames.clone())?;
        sources.push(Box::new(microphone));

        let system_audio_problem = start_system_audio(&mut sources, frames);

        Ok((
            Self {
                sources,
                consumer: tokio::spawn(emit_levels(incoming, emitter)),
            },
            AudioCheckStatus {
                system_audio_problem,
            },
        ))
    }

    pub fn stop(mut self) -> Result<()> {
        self.consumer.abort();

        for source in &mut self.sources {
            source.stop()?;
        }

        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn start_system_audio(
    sources: &mut Vec<Box<dyn AudioSource>>,
    frames: mpsc::Sender<AudioFrame>,
) -> Option<String> {
    use cueline_platform_macos::SystemAudioSource;

    let mut system_audio = SystemAudioSource::new();

    match system_audio.start(frames) {
        Ok(()) => {
            sources.push(Box::new(system_audio));
            None
        }
        Err(error) => Some(error.to_string()),
    }
}

#[cfg(not(target_os = "macos"))]
fn start_system_audio(
    _sources: &mut Vec<Box<dyn AudioSource>>,
    _frames: mpsc::Sender<AudioFrame>,
) -> Option<String> {
    Some("Capturing the other side of the call is only available on macOS for now".to_owned())
}

async fn emit_levels(mut frames: mpsc::Receiver<AudioFrame>, emitter: Emitter) {
    let mut last_emit: HashMap<Speaker, Instant> = HashMap::new();

    while let Some(frame) = frames.recv().await {
        let due = last_emit
            .get(&frame.speaker)
            .is_none_or(|at| at.elapsed() >= LEVEL_EMIT_INTERVAL);

        if !due {
            continue;
        }

        last_emit.insert(frame.speaker, Instant::now());
        emitter.audio_level(AudioLevelEvent {
            speaker: frame.speaker,
            level: frame.level(),
        });
    }
}
