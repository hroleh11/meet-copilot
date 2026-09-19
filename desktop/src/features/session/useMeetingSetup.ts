import { useCallback } from 'react';
import type { Language, MeetingProfile, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';

interface UseMeetingSetupResult {
  profile: MeetingProfile;
  language: Language;
  setProfile: (profile: MeetingProfile) => void;
  setLanguage: (language: Language) => void;
}

/// What the user picks before a meeting is what they want next time too, so the
/// choice goes into the user settings rather than living until the window is
/// rebuilt.
export function useMeetingSetup(
  defaults: UserSettings | null,
  onRemember: (settings: UserSettings) => void,
): UseMeetingSetupResult {
  const [profile, setProfile] = useResettableDraft<MeetingProfile>(
    defaults?.defaultProfile ?? 'daily',
  );
  const [language, setLanguage] = useResettableDraft<Language>(
    defaults?.defaultLanguage ?? 'uk',
  );

  const rememberProfile = useCallback(
    (chosen: MeetingProfile) => {
      setProfile(chosen);

      if (defaults) {
        onRemember({ ...defaults, defaultProfile: chosen });
      }
    },
    [defaults, onRemember, setProfile],
  );

  const rememberLanguage = useCallback(
    (chosen: Language) => {
      setLanguage(chosen);

      if (defaults) {
        onRemember({ ...defaults, defaultLanguage: chosen });
      }
    },
    [defaults, onRemember, setLanguage],
  );

  return {
    profile,
    language,
    setProfile: rememberProfile,
    setLanguage: rememberLanguage,
  };
}
