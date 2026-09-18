import { create } from 'zustand';
import type { Profile } from '~/shared/ipc';

interface AuthStore {
  signedIn: boolean;
  profile: Profile | null;
  ready: boolean;
  setAuth: (signedIn: boolean, profile: Profile | null) => void;
  markReady: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  signedIn: false,
  profile: null,
  ready: false,
  setAuth: (signedIn, profile) => set({ signedIn, profile, ready: true }),
  markReady: () => set({ ready: true }),
}));
