import { uk } from '~/shared/i18n/uk';
import { Button, Field, LevelMeter } from '~/shared/ui';
import { useAudioCheck } from './useAudioCheck';

export interface AudioFieldProps {
  deviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
}

const selectClass =
  'rounded-md border border-separator bg-surface-primary px-3 py-2 text-body text-ink-primary outline-none focus:border-accent';

export function AudioField({ deviceId, onDeviceChange }: AudioFieldProps) {
  const { devices, running, levels, systemAudioProblem, error, toggle } = useAudioCheck();

  return (
    <Field label={uk.settings.audio}>
      <div className="flex flex-col gap-3">
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

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-caption text-ink-secondary">
              {uk.settings.microphone}
            </span>
            <LevelMeter level={levels.me} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-caption text-ink-secondary">
              {uk.settings.systemAudio}
            </span>
            <LevelMeter level={levels.other} />
          </div>
        </div>

        <div>
          <Button
            variant="ghost"
            onClick={() => {
              toggle(deviceId);
            }}
          >
            {running ? uk.settings.stopCheck : uk.settings.checkAudio}
          </Button>
        </div>

        {systemAudioProblem ? (
          <p className="text-body text-danger">{uk.settings.screenRecordingNeeded}</p>
        ) : null}
        {error ? <p className="text-body text-danger">{error}</p> : null}
      </div>
    </Field>
  );
}
