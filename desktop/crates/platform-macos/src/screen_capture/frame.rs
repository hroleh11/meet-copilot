use meet_copilot_core::{
    error::{Error, Result},
    screenshot::RawFrame,
};
use objc2_core_graphics::{CGDataProvider, CGImage};

pub fn to_raw_frame(image: &CGImage) -> Result<RawFrame> {
    let provider = CGImage::data_provider(Some(image))
        .ok_or_else(|| Error::Screen("The screenshot carried no pixels".to_owned()))?;
    let data = CGDataProvider::data(Some(&provider))
        .ok_or_else(|| Error::Screen("The screenshot pixels could not be read".to_owned()))?;

    Ok(RawFrame {
        width: CGImage::width(Some(image)) as u32,
        height: CGImage::height(Some(image)) as u32,
        stride: CGImage::bytes_per_row(Some(image)),
        bgra: unsafe { data.as_bytes_unchecked() }.to_vec(),
    })
}
