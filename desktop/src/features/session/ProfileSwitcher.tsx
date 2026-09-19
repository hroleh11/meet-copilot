import { uk } from '~/shared/i18n/uk';
import type { MeetingProfile } from '~/shared/ipc';
import { SegmentedControl } from '~/shared/ui';

export interface ProfileSwitcherProps {
  profile: MeetingProfile;
  disabled: boolean;
  onChange: (profile: MeetingProfile) => void;
}

const PROFILES: MeetingProfile[] = ['daily', 'interview_candidate', 'client_call'];

const OPTIONS = PROFILES.map((profile) => ({
  value: profile,
  label: uk.profile[profile],
}));

export function ProfileSwitcher({ profile, disabled, onChange }: ProfileSwitcherProps) {
  return (
    <SegmentedControl
      label={uk.meeting.profile}
      options={OPTIONS}
      value={profile}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
