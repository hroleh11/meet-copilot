use audioadapter_buffers::direct::InterleavedSlice;
use rubato::{Fft, FixedSync, Resampler};

use crate::{
    audio::frame::SAMPLES_PER_FRAME,
    error::{Error, Result},
};

const SUB_CHUNKS: usize = 1;
const MONO: usize = 1;

/// Resamples a mono f32 stream at an arbitrary input rate into complete
/// [`SAMPLES_PER_FRAME`]-sample i16 chunks at the canonical rate.
pub struct MonoResampler {
    resampler: Fft<f32>,
    input_buffer: Vec<f32>,
    output_scratch: Vec<f32>,
    frame_carry: Vec<i16>,
}

impl MonoResampler {
    pub fn new(input_rate_hz: u32, output_rate_hz: u32) -> Result<Self> {
        let resampler = Fft::<f32>::new(
            input_rate_hz as usize,
            output_rate_hz as usize,
            SAMPLES_PER_FRAME,
            SUB_CHUNKS,
            MONO,
            FixedSync::Output,
        )
        .map_err(|error| Error::Audio(format!("Could not build the resampler: {error}")))?;

        let output_scratch = vec![0.0_f32; resampler.output_frames_max()];
        let input_capacity = resampler.input_frames_max().max(1) * 2;

        Ok(Self {
            resampler,
            input_buffer: Vec::with_capacity(input_capacity),
            output_scratch,
            frame_carry: Vec::with_capacity(SAMPLES_PER_FRAME * 2),
        })
    }

    /// Feeds mono samples in and returns every complete frame that became
    /// available. Leftover samples are kept for the next call.
    pub fn push(&mut self, mono_samples: &[f32]) -> Result<Vec<Vec<i16>>> {
        self.input_buffer.extend_from_slice(mono_samples);

        let mut frames = Vec::new();

        while self.input_buffer.len() >= self.resampler.input_frames_next() {
            self.resample_one_chunk()?;
            self.drain_complete_frames(&mut frames);
        }

        Ok(frames)
    }

    fn resample_one_chunk(&mut self) -> Result<()> {
        let needed = self.resampler.input_frames_next();
        let produced = self.resampler.output_frames_next();

        let input = InterleavedSlice::new(&self.input_buffer[..needed], MONO, needed)
            .map_err(|error| Error::Audio(format!("Bad resampler input: {error}")))?;
        let mut output =
            InterleavedSlice::new_mut(&mut self.output_scratch[..produced], MONO, produced)
                .map_err(|error| Error::Audio(format!("Bad resampler output: {error}")))?;

        self.resampler
            .process_into_buffer(&input, &mut output, None)
            .map_err(|error| Error::Audio(format!("Resampling failed: {error}")))?;

        self.input_buffer.drain(..needed);
        self.frame_carry.extend(
            self.output_scratch[..produced]
                .iter()
                .map(|sample| to_i16(*sample)),
        );

        Ok(())
    }

    fn drain_complete_frames(&mut self, frames: &mut Vec<Vec<i16>>) {
        while self.frame_carry.len() >= SAMPLES_PER_FRAME {
            frames.push(self.frame_carry.drain(..SAMPLES_PER_FRAME).collect());
        }
    }
}

fn to_i16(sample: f32) -> i16 {
    (sample.clamp(-1.0, 1.0) * f32::from(i16::MAX)) as i16
}

pub fn downmix_to_mono(interleaved: &[f32], channels: u16) -> Vec<f32> {
    if channels <= 1 {
        return interleaved.to_vec();
    }

    let channels = usize::from(channels);

    interleaved
        .chunks_exact(channels)
        .map(|frame| frame.iter().sum::<f32>() / channels as f32)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::audio::frame::SAMPLE_RATE_HZ;
    use std::f32::consts::PI;

    #[test]
    fn downmixing_a_single_channel_is_a_no_op() {
        let samples = vec![0.1, -0.2, 0.3];

        assert_eq!(downmix_to_mono(&samples, 1), samples);
    }

    #[test]
    fn downmixing_stereo_averages_the_two_channels() {
        let interleaved = vec![1.0, -1.0, 0.5, 0.5];

        assert_eq!(downmix_to_mono(&interleaved, 2), vec![0.0, 0.5]);
    }

    #[test]
    fn resampling_at_the_same_rate_preserves_the_sample_count() {
        let mut resampler = MonoResampler::new(SAMPLE_RATE_HZ, SAMPLE_RATE_HZ).expect("builds");
        let one_second = vec![0.0_f32; SAMPLE_RATE_HZ as usize];

        let frames = resampler.push(&one_second).expect("resamples");

        assert_eq!(frames.iter().map(Vec::len).sum::<usize>(), one_second.len());
        assert!(frames.iter().all(|frame| frame.len() == SAMPLES_PER_FRAME));
    }

    #[test]
    fn downsampling_from_48khz_yields_16khz_worth_of_frames() {
        let input_rate = 48_000_u32;
        let mut resampler = MonoResampler::new(input_rate, SAMPLE_RATE_HZ).expect("builds");

        let seconds = 2;
        let tone = sine_wave(440.0, input_rate, seconds);

        let mut total_samples = 0;
        for chunk in tone.chunks(960) {
            let frames = resampler.push(chunk).expect("resamples");
            total_samples += frames.iter().map(Vec::len).sum::<usize>();
        }

        let expected =
            (SAMPLE_RATE_HZ as usize * seconds as usize) / SAMPLES_PER_FRAME * SAMPLES_PER_FRAME;
        let tolerance = SAMPLES_PER_FRAME * 2;

        assert!(
            total_samples.abs_diff(expected) <= tolerance,
            "expected close to {expected} samples, got {total_samples}"
        );
    }

    #[test]
    fn a_full_scale_tone_stays_within_i16_range() {
        let mut resampler = MonoResampler::new(SAMPLE_RATE_HZ, SAMPLE_RATE_HZ).expect("builds");
        let tone = sine_wave(1000.0, SAMPLE_RATE_HZ, 1);

        let frames = resampler.push(&tone).expect("resamples");

        for sample in frames.iter().flatten() {
            assert!((*sample as i32).unsigned_abs() <= i16::MAX as u32);
        }
    }

    fn sine_wave(frequency_hz: f32, sample_rate_hz: u32, seconds: u32) -> Vec<f32> {
        let total = sample_rate_hz as usize * seconds as usize;

        (0..total)
            .map(|index| {
                let t = index as f32 / sample_rate_hz as f32;
                (2.0 * PI * frequency_hz * t).sin()
            })
            .collect()
    }
}
