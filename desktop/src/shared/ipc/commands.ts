import { invoke } from '@tauri-apps/api/core';
import type { LocalSettings, Profile, UserSettings } from './types';

export interface AuthState {
  signedIn: boolean;
  profile: Profile | null;
}

export const authState = (): Promise<AuthState> => invoke('auth_state');

export const startLogin = (): Promise<void> => invoke('start_login');

export const completeLogin = (code: string): Promise<AuthState> =>
  invoke('complete_login', { code });

export const logout = (): Promise<AuthState> => invoke('logout');

export const getLocalSettings = (): Promise<LocalSettings> =>
  invoke('get_local_settings');

export const saveLocalSettings = (settings: LocalSettings): Promise<LocalSettings> =>
  invoke('save_local_settings', { settings });

export const getUserSettings = (): Promise<UserSettings> => invoke('get_user_settings');

export const saveUserSettings = (settings: UserSettings): Promise<UserSettings> =>
  invoke('save_user_settings', { settings });

export const checkBackend = (): Promise<string> => invoke('check_backend');
