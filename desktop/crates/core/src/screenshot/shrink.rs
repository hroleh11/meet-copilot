use std::io::Cursor;

use image::{codecs::jpeg::JpegEncoder, imageops::FilterType, DynamicImage, RgbImage};

use crate::{
    error::{Error, Result},
    screenshot::capture::{RawFrame, Screenshot},
};

pub const JPEG_MIME: &str = "image/jpeg";
pub const MAX_EDGE: u32 = 1400;

const MAX_BYTES: usize = 400_000;
const QUALITIES: [u8; 3] = [80, 62, 45];
const BYTES_PER_PIXEL: usize = 4;

pub fn shrink(frame: RawFrame) -> Result<Screenshot> {
    let image = fit(decode(frame)?);
    let mut smallest = encode(&image, QUALITIES[0])?;

    for quality in QUALITIES.into_iter().skip(1) {
        if smallest.len() <= MAX_BYTES {
            break;
        }

        smallest = encode(&image, quality)?;
    }

    Ok(Screenshot {
        mime_type: JPEG_MIME.to_owned(),
        bytes: smallest,
    })
}

fn decode(frame: RawFrame) -> Result<DynamicImage> {
    let row = frame.width as usize * BYTES_PER_PIXEL;
    let needed = frame.stride * frame.height as usize;

    if frame.width == 0 || frame.height == 0 || frame.stride < row || frame.bgra.len() < needed {
        return Err(Error::Screen(
            "The screenshot came back in a shape we cannot read".to_owned(),
        ));
    }

    let mut pixels = Vec::with_capacity(frame.width as usize * frame.height as usize * 3);

    for y in 0..frame.height as usize {
        let line = &frame.bgra[y * frame.stride..y * frame.stride + row];

        for pixel in line.chunks_exact(BYTES_PER_PIXEL) {
            pixels.extend_from_slice(&[pixel[2], pixel[1], pixel[0]]);
        }
    }

    RgbImage::from_raw(frame.width, frame.height, pixels)
        .map(DynamicImage::ImageRgb8)
        .ok_or_else(|| Error::Screen("The screenshot did not fill its own size".to_owned()))
}

fn fit(image: DynamicImage) -> DynamicImage {
    if image.width().max(image.height()) <= MAX_EDGE {
        return image;
    }

    image.resize(MAX_EDGE, MAX_EDGE, FilterType::Lanczos3)
}

fn encode(image: &DynamicImage, quality: u8) -> Result<Vec<u8>> {
    let mut bytes = Vec::new();

    image
        .to_rgb8()
        .write_with_encoder(JpegEncoder::new_with_quality(
            &mut Cursor::new(&mut bytes),
            quality,
        ))
        .map_err(|error| Error::Screen(format!("Could not encode the screenshot: {error}")))?;

    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn frame(width: u32, height: u32, padding: usize) -> RawFrame {
        let stride = width as usize * BYTES_PER_PIXEL + padding;
        let mut bgra = vec![0u8; stride * height as usize];

        for y in 0..height as usize {
            for x in 0..width as usize {
                let at = y * stride + x * BYTES_PER_PIXEL;
                bgra[at] = (x % 255) as u8;
                bgra[at + 1] = (y % 255) as u8;
                bgra[at + 2] = 90;
                bgra[at + 3] = 255;
            }
        }

        RawFrame {
            width,
            height,
            stride,
            bgra,
        }
    }

    #[test]
    fn keeps_a_small_picture_at_its_size() {
        let shrunk = shrink(frame(800, 600, 0)).expect("shrink");
        let decoded = image::load_from_memory(&shrunk.bytes).expect("decode");

        assert_eq!(shrunk.mime_type, JPEG_MIME);
        assert_eq!((decoded.width(), decoded.height()), (800, 600));
    }

    #[test]
    fn reads_rows_that_are_padded_to_a_longer_stride() {
        let shrunk = shrink(frame(64, 32, 48)).expect("shrink");
        let decoded = image::load_from_memory(&shrunk.bytes).expect("decode");

        assert_eq!((decoded.width(), decoded.height()), (64, 32));
    }

    #[test]
    fn brings_a_retina_region_down_to_the_long_edge() {
        let shrunk = shrink(frame(3200, 1800, 0)).expect("shrink");
        let decoded = image::load_from_memory(&shrunk.bytes).expect("decode");

        assert_eq!(decoded.width(), MAX_EDGE);
        assert!(shrunk.bytes.len() <= MAX_BYTES);
    }

    #[test]
    fn refuses_a_frame_shorter_than_it_claims() {
        let mut short = frame(64, 32, 0);
        short.bgra.truncate(100);

        assert!(shrink(short).is_err());
    }
}
