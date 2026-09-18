import type { Language, MeetingProfile, UserSettings } from '~/shared/ipc';
import { useResettableDraft } from '~/shared/lib/useResettableDraft';

interface UseMeetingSetupResult {
  profile: MeetingProfile;
  language: Language;
  setProfile: (profile: MeetingProfile) => void;
  setLanguage: (language: Language) => void;
}

export function useMeetingSetup(defaults: UserSettings | null): UseMeetingSetupResult {
  const [profile, setProfile] = useResettableDraft<MeetingProfile>(
    defaults?.defaultProfile ?? 'daily',
  );
  const [language, setLanguage] = useResettableDraft<Language>(
    defaults?.defaultLanguage ?? 'uk',
  );

  return { profile, language, setProfile, setLanguage };
}
