use block2::RcBlock;
use cueline_core::{
    audio::{AudioFrame, AudioSource, MonoResampler, SAMPLE_RATE_HZ},
    domain::Speaker,
    error::{Error, Result},
};
use dispatch2::DispatchQueue;
use objc2::{rc::Retained, runtime::ProtocolObject, AnyThread};
use objc2_core_media::CMTime;
use objc2_foundation::{NSArray, NSError};
use objc2_screen_capture_kit::{
    SCContentFilter, SCStream, SCStreamConfiguration, SCStreamOutputType,
};
use tokio::sync::mpsc::{self, Sender};
use tokio_util::sync::CancellationToken;

use super::stream_output::SystemAudioOutput;
use crate::{
    capture_kit::{shareable_content, wait_for, ThreadSafe},
    permissions::{request_screen_recording_access, screen_recording_access},
};

const CAPTURE_RATE_HZ: usize = 48_000;
const CAPTURE_CHANNELS: usize = 2;
const RAW_CHANNEL_CAPACITY: usize = 32;
const FRAME_SIZE_PX: usize = 2;

pub struct SystemAudioSource {
    stream: Option<ThreadSafe<SCStream>>,
    output: Option<ThreadSafe<SystemAudioOutput>>,
    cancel: CancellationToken,
}

impl Default for SystemAudioSource {
    fn default() -> Self {
        Self::new()
    }
}

impl SystemAudioSource {
    pub fn new() -> Self {
        Self {
            stream: None,
            output: None,
            cancel: CancellationToken::new(),
        }
    }
}

impl AudioSource for SystemAudioSource {
    fn start(&mut self, sink: Sender<AudioFrame>) -> Result<()> {
        let (raw_tx, raw_rx) = mpsc::channel::<Vec<f32>>(RAW_CHANNEL_CAPACITY);
        let output = SystemAudioOutput::new(raw_tx);
        let stream = build_stream(&output).map_err(explain_failure)?;

        attach_output(&stream, &output).map_err(explain_failure)?;
        start_capture(&stream).map_err(explain_failure)?;

        self.cancel = CancellationToken::new();
        spawn_processing_task(raw_rx, sink, self.cancel.clone());
        self.output = Some(ThreadSafe::new(output));
        self.stream = Some(ThreadSafe::new(stream));

        Ok(())
    }

    fn stop(&mut self) -> Result<()> {
        self.cancel.cancel();

        if let Some(stream) = self.stream.take() {
            unsafe { stream.get().stopCaptureWithCompletionHandler(None) };
        }

        self.output = None;

        Ok(())
    }
}

/// macOS reports Screen Recording through several paths that disagree, so the
/// capture is attempted first and the permission is only blamed once it fails.
fn explain_failure(error: Error) -> Error {
    if screen_recording_access().is_granted() {
        return error;
    }

    request_screen_recording_access();

    Error::Permission(
        "Allow Screen Recording for Cueline in System Settings, Privacy and Security, so it can hear the other side of the call".to_owned(),
    )
}

fn build_stream(output: &Retained<SystemAudioOutput>) -> Result<Retained<SCStream>> {
    let content = shareable_content()?;
    let displays = unsafe { content.get().displays() };
    let display = displays
        .firstObject()
        .ok_or_else(|| Error::Audio("No display is available to capture audio from".to_owned()))?;

    let filter = unsafe {
        SCContentFilter::initWithDisplay_excludingWindows(
            SCContentFilter::alloc(),
            &display,
            &NSArray::new(),
        )
    };

    let configuration = unsafe { SCStreamConfiguration::new() };

    unsafe {
        configuration.setCapturesAudio(true);
        configuration.setSampleRate(CAPTURE_RATE_HZ as isize);
        configuration.setChannelCount(CAPTURE_CHANNELS as isize);
        configuration.setExcludesCurrentProcessAudio(true);
        configuration.setWidth(FRAME_SIZE_PX);
        configuration.setHeight(FRAME_SIZE_PX);
        configuration.setMinimumFrameInterval(CMTime {
            value: 1,
            timescale: 1,
            flags: objc2_core_media::CMTimeFlags::Valid,
            epoch: 0,
        });
    }

    let delegate = ProtocolObject::from_ref(&**output);

    Ok(unsafe {
        SCStream::initWithFilter_configuration_delegate(
            SCStream::alloc(),
            &filter,
            &configuration,
            Some(delegate),
        )
    })
}

fn attach_output(stream: &Retained<SCStream>, output: &Retained<SystemAudioOutput>) -> Result<()> {
    let queue = DispatchQueue::new("com.cueline.system-audio", None);
    let handler = ProtocolObject::from_ref(&**output);

    unsafe {
        stream.addStreamOutput_type_sampleHandlerQueue_error(
            handler,
            SCStreamOutputType::Audio,
            Some(&queue),
        )
    }
    .map_err(|error| Error::Audio(format!("Could not attach the audio output: {error}")))
}

fn start_capture(stream: &Retained<SCStream>) -> Result<()> {
    wait_for("start capturing the meeting audio", |done| {
        let handler = RcBlock::new(move |error: *mut NSError| {
            let _ = done.send(match unsafe { error.as_ref() } {
                Some(error) => Err(Error::Audio(format!(
                    "Could not start the capture: {error}"
                ))),
                None => Ok(()),
            });
        });

        unsafe { stream.startCaptureWithCompletionHandler(Some(&handler)) };
    })?
}

fn spawn_processing_task(
    mut raw_rx: mpsc::Receiver<Vec<f32>>,
    sink: Sender<AudioFrame>,
    cancel: CancellationToken,
) {
    tokio::spawn(async move {
        let mut resampler = match MonoResampler::new(CAPTURE_RATE_HZ as u32, SAMPLE_RATE_HZ) {
            Ok(resampler) => resampler,
            Err(error) => {
                tracing::warn!("could not build the system audio resampler: {error}");
                return;
            }
        };

        loop {
            let chunk = tokio::select! {
                _ = cancel.cancelled() => break,
                chunk = raw_rx.recv() => chunk,
            };

            let Some(chunk) = chunk else { break };

            let frames = match resampler.push(&chunk) {
                Ok(frames) => frames,
                Err(error) => {
                    tracing::warn!("could not resample system audio: {error}");
                    continue;
                }
            };

            for samples in frames {
                if sink
                    .send(AudioFrame::new(Speaker::Other, samples))
                    .await
                    .is_err()
                {
                    return;
                }
            }
        }
    });
}
