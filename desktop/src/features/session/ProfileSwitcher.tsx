import { uk } from '~/shared/i18n/uk';
import type { MeetingProfile } from '~/shared/ipc';

export interface ProfileSwitcherProps {
  profile: MeetingProfile;
  disabled: boolean;
  onChange: (profile: MeetingProfile) => void;
}

const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

export function ProfileSwitcher({ profile, disabled, onChange }: ProfileSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label={uk.meeting.profile}
      className="flex gap-px rounded-md bg-surface-primary p-px"
    >
      {PROFILES.map((option) => {
        const selected = option === profile;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => {
              onChange(option);
            }}
            className={`flex-grow rounded-sm px-2 py-1 text-caption transition disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? 'bg-surface-elevated font-semibold text-ink-primary shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                : 'text-ink-secondary'
            }`}
          >
            {uk.profile[option]}
          </button>
        );
      })}
    </div>
  );
}
