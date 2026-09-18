use std::time::Instant;

use crate::domain::Speaker;

pub const SAMPLE_RATE_HZ: u32 = 16_000;
pub const FRAME_DURATION_MS: u32 = 100;
pub const SAMPLES_PER_FRAME: usize = (SAMPLE_RATE_HZ as usize * FRAME_DURATION_MS as usize) / 1000;

#[derive(Debug, Clone)]
pub struct AudioFrame {
    pub speaker: Speaker,
    pub samples: Vec<i16>,
    pub captured_at: Instant,
}

impl AudioFrame {
    pub fn new(speaker: Speaker, samples: Vec<i16>) -> Self {
        Self {
            speaker,
            samples,
            captured_at: Instant::now(),
        }
    }

    pub fn to_le_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.samples.len() * 2);

        for sample in &self.samples {
            bytes.extend_from_slice(&sample.to_le_bytes());
        }

        bytes
    }

    pub fn level(&self) -> f32 {
        if self.samples.is_empty() {
            return 0.0;
        }

        let sum: f64 = self
            .samples
            .iter()
            .map(|sample| {
                let normalized = f64::from(*sample) / f64::from(i16::MAX);
                normalized * normalized
            })
            .sum();

        (sum / self.samples.len() as f64).sqrt() as f32
    }
}
