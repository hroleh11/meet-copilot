import { uk } from '~/shared/i18n/uk';
import type { LocalSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';
import { Button, LevelMeter, Select } from '~/shared/ui';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { useAudioCheck } from './useAudioCheck';

export interface AudioTabProps {
  settings: LocalSettings;
  onSave: (settings: LocalSettings) => void;
}

const DEFAULT_DEVICE = '';

export function AudioTab({ settings, onSave }: AudioTabProps) {
  const [inputDevice, setInputDevice] = useResettableDraft(settings.inputDevice);
  const { devices, running, levels, systemAudioProblem, error, toggle } = useAudioCheck();

  const options = [
    { value: DEFAULT_DEVICE, label: uk.settings.microphoneDefault },
    ...devices.map((device) => ({
      value: device.id,
      label: device.bluetooth ? `${device.name} (Bluetooth)` : device.name,
    })),
  ];

  const bluetoothChosen = devices.some(
    (device) => device.id === inputDevice && device.bluetooth,
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <SettingsGroup title={uk.settings.groupSources}>
          <SettingsRow label={uk.settings.audioDevice}>
            <Select
              label={uk.settings.audioDevice}
              options={options}
              value={inputDevice ?? DEFAULT_DEVICE}
              tone="recessed"
              className="w-[260px]"
              onChange={(chosen) => {
                setInputDevice(chosen || null);
              }}
            />
          </SettingsRow>

          <SettingsRow label={uk.settings.microphone}>
            <span className="w-[260px]">
              <LevelMeter level={levels.me} />
            </span>
          </SettingsRow>

          <SettingsRow label={uk.settings.systemAudio}>
            <span className="w-[260px]">
              <LevelMeter level={levels.other} />
            </span>
          </SettingsRow>

          <SettingsRow label={uk.settings.audioCheck} hint={uk.settings.audioCheckHint}>
            <Button
              variant="secondary"
              className="h-8"
              onClick={() => {
                toggle(inputDevice);
              }}
            >
              {running ? uk.settings.stopCheck : uk.settings.checkAudio}
            </Button>
          </SettingsRow>
        </SettingsGroup>

        <div>
          <Button
            className="h-8"
            onClick={() => {
              onSave({ ...settings, inputDevice });
            }}
          >
            {uk.settings.save}
          </Button>
        </div>
      </div>

      {bluetoothChosen ? (
        <p className="text-body text-danger">{uk.settings.bluetoothMicrophone}</p>
      ) : null}
      {systemAudioProblem ? (
        <p className="text-body text-danger">{uk.settings.screenRecordingNeeded}</p>
      ) : null}
      {error ? <p className="text-body text-danger">{error}</p> : null}
    </>
  );
}
