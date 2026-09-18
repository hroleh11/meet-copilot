use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

pub fn list_input_devices() -> Result<Vec<AudioDevice>> {
    let host = cpal::default_host();
    let default_id = host
        .default_input_device()
        .and_then(|device| device.id().ok());

    let devices = host
        .input_devices()
        .map_err(|error| Error::Audio(format!("Could not list microphones: {error}")))?;

    Ok(devices
        .filter_map(|device| {
            let id = device.id().ok()?;
            let name = device
                .description()
                .map(|description| description.name().to_owned())
                .unwrap_or_else(|_| id.to_string());

            Some(AudioDevice {
                is_default: default_id.as_ref() == Some(&id),
                id: id.to_string(),
                name,
            })
        })
        .collect())
}

pub(crate) fn resolve_input_device(device_id: Option<&str>) -> Result<cpal::Device> {
    let host = cpal::default_host();

    if let Some(id) = device_id.and_then(|id| id.parse::<cpal::DeviceId>().ok()) {
        if let Some(device) = host.device_by_id(&id) {
            return Ok(device);
        }
    }

    host.default_input_device()
        .ok_or_else(|| Error::Permission("No microphone is available".to_owned()))
}
