use cpal::{
    traits::{DeviceTrait, StreamTrait},
    FromSample, Sample, SampleFormat, SizedSample,
};
use tokio::sync::mpsc::{self, Sender};
use tokio_util::sync::CancellationToken;

use crate::{
    audio::{
        device::resolve_input_device,
        frame::{AudioFrame, SAMPLE_RATE_HZ},
        resampler::{downmix_to_mono, MonoResampler},
        source::AudioSource,
    },
    domain::Speaker,
    error::{Error, Result},
};

const RAW_CHANNEL_CAPACITY: usize = 32;

pub struct MicrophoneSource {
    device_id: Option<String>,
    stream: Option<cpal::Stream>,
    cancel: CancellationToken,
}

impl MicrophoneSource {
    pub fn new(device_id: Option<String>) -> Self {
        Self {
            device_id,
            stream: None,
            cancel: CancellationToken::new(),
        }
    }
}

impl AudioSource for MicrophoneSource {
    fn start(&mut self, sink: Sender<AudioFrame>) -> Result<()> {
        let device = resolve_input_device(self.device_id.as_deref())?;
        let config = device.default_input_config().map_err(|error| {
            Error::Audio(format!("Could not read the microphone format: {error}"))
        })?;

        let channels = config.channels();
        let sample_rate = config.sample_rate();
        let sample_format = config.sample_format();
        let stream_config = config.config();

        let (raw_tx, raw_rx) = mpsc::channel::<Vec<f32>>(RAW_CHANNEL_CAPACITY);

        let stream = build_stream(&device, &stream_config, sample_format, channels, raw_tx)?;
        stream.play().map_err(|error| {
            Error::Permission(format!("Could not start the microphone: {error}"))
        })?;

        self.cancel = CancellationToken::new();
        spawn_processing_task(raw_rx, sink, sample_rate, self.cancel.clone());
        self.stream = Some(stream);

        Ok(())
    }

    fn stop(&mut self) -> Result<()> {
        self.cancel.cancel();
        self.stream = None;

        Ok(())
    }
}

fn build_stream(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    sample_format: SampleFormat,
    channels: u16,
    raw_tx: Sender<Vec<f32>>,
) -> Result<cpal::Stream> {
    match sample_format {
        SampleFormat::F32 => build_typed_stream::<f32>(device, config, channels, raw_tx),
        SampleFormat::I16 => build_typed_stream::<i16>(device, config, channels, raw_tx),
        SampleFormat::U16 => build_typed_stream::<u16>(device, config, channels, raw_tx),
        other => Err(Error::Audio(format!(
            "The microphone uses an unsupported sample format: {other:?}"
        ))),
    }
}

fn build_typed_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    channels: u16,
    raw_tx: Sender<Vec<f32>>,
) -> Result<cpal::Stream>
where
    T: SizedSample,
    f32: FromSample<T>,
{
    device
        .build_input_stream(
            config,
            move |data: &[T], _| {
                let mono = to_mono_f32(data, channels);
                let _ = raw_tx.try_send(mono);
            },
            |error| tracing::warn!("microphone stream error: {error}"),
            None,
        )
        .map_err(|error| Error::Permission(format!("Could not open the microphone: {error}")))
}

fn to_mono_f32<T>(data: &[T], channels: u16) -> Vec<f32>
where
    T: Sample,
    f32: FromSample<T>,
{
    let interleaved: Vec<f32> = data.iter().map(|sample| sample.to_sample()).collect();

    downmix_to_mono(&interleaved, channels)
}

fn spawn_processing_task(
    mut raw_rx: mpsc::Receiver<Vec<f32>>,
    sink: Sender<AudioFrame>,
    input_rate: u32,
    cancel: CancellationToken,
) {
    tokio::spawn(async move {
        let mut resampler = match MonoResampler::new(input_rate, SAMPLE_RATE_HZ) {
            Ok(resampler) => resampler,
            Err(error) => {
                tracing::warn!("could not build the microphone resampler: {error}");
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
                    tracing::warn!("could not resample microphone audio: {error}");
                    continue;
                }
            };

            for samples in frames {
                if sink
                    .send(AudioFrame::new(Speaker::Me, samples))
                    .await
                    .is_err()
                {
                    return;
                }
            }
        }
    });
}
