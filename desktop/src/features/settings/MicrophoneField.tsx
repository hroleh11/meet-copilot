import { uk } from '~/shared/i18n/uk';
import { Button, Field, LevelMeter } from '~/shared/ui';
import { useMicrophoneTest } from './useMicrophoneTest';

export interface MicrophoneFieldProps {
  deviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
}

const selectClass =
  'rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500';

export function MicrophoneField({ deviceId, onDeviceChange }: MicrophoneFieldProps) {
  const { devices, testing, level, error, toggle } = useMicrophoneTest();

  return (
    <Field label={uk.settings.microphone}>
      <div className="flex flex-col gap-2">
        <select
          value={deviceId ?? ''}
          onChange={(event) => {
            onDeviceChange(event.target.value || null);
          }}
          className={selectClass}
        >
          <option value="">{uk.settings.microphoneDefault}</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              toggle(deviceId);
            }}
          >
            {testing ? uk.settings.stopTest : uk.settings.testMicrophone}
          </Button>
          <div className="flex-1">
            <LevelMeter level={level} />
          </div>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </Field>
  );
}
