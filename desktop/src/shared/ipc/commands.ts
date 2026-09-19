import { invoke } from '@tauri-apps/api/core';
import type {
  AudioDevice,
  AudioPermission,
  ChatMessage,
  ChatSession,
  GenerationMode,
  LocalSettings,
  Meeting,
  MeetingDetails,
  MeetingScope,
  MeetingStart,
  Profile,
  Project,
  Resource,
  ResourceContent,
  ResourceLimits,
  ResourceScope,
  SessionState,
  UserSettings,
} from './types';

export interface AuthState {
  signedIn: boolean;
  profile: Profile | null;
}

export const authState = (): Promise<AuthState> => invoke('auth_state');

export const signIn = (email: string, password: string): Promise<AuthState> =>
  invoke('sign_in', { email, password });

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

export const listAudioDevices = (): Promise<AudioDevice[]> =>
  invoke('list_audio_devices');

export const openAudioPermission = (permission: AudioPermission): Promise<void> =>
  invoke('open_audio_permission', { permission });

export const systemAudioAllowed = (): Promise<boolean> => invoke('system_audio_allowed');

export interface AudioCheckStatus {
  systemAudioProblem: string | null;
}

export const startAudioCheck = (deviceId: string | null): Promise<AudioCheckStatus> =>
  invoke('start_audio_check', { deviceId });

export const stopAudioCheck = (): Promise<void> => invoke('stop_audio_check');

export interface StartedMeeting {
  meetingId: string;
  systemAudioProblem: string | null;
}

export const listMeetings = (
  cursor: string | null,
  scope: MeetingScope,
): Promise<Meeting[]> => invoke('list_meetings', { cursor, scope });

export const renameMeeting = (id: string, title: string): Promise<Meeting> =>
  invoke('rename_meeting', { id, title });

export const moveMeeting = (id: string, project: string | null): Promise<Meeting> =>
  invoke('move_meeting', { id, project });

export const deleteMeeting = (id: string): Promise<void> =>
  invoke('delete_meeting', { id });

export const listProjects = (): Promise<Project[]> => invoke('list_projects');

export const createProject = (name: string): Promise<Project> =>
  invoke('create_project', { name });

export const renameProject = (id: string, name: string): Promise<Project> =>
  invoke('rename_project', { id, name });

export const deleteProject = (id: string): Promise<void> =>
  invoke('delete_project', { id });

export const listResources = (scope: ResourceScope): Promise<Resource[]> =>
  invoke('list_resources', { scope });

export const uploadResource = (scope: ResourceScope, path: string): Promise<Resource> =>
  invoke('upload_resource', { scope, path });

export const addResourceText = (
  scope: ResourceScope,
  name: string,
  text: string,
): Promise<Resource> => invoke('add_resource_text', { scope, name, text });

export const getResource = (id: string): Promise<Resource> =>
  invoke('get_resource', { id });

export const resourceContent = (id: string): Promise<ResourceContent> =>
  invoke('resource_content', { id });

export const resourceLimits = (): Promise<ResourceLimits> => invoke('resource_limits');

export const deleteResource = (id: string): Promise<void> =>
  invoke('delete_resource', { id });

export const meetingChats = (id: string, query: string | null): Promise<ChatSession[]> =>
  invoke('meeting_chats', { id, query });

export const startMeetingChat = (id: string): Promise<ChatSession> =>
  invoke('start_meeting_chat', { id });

export const chatMessages = (id: string, chat: string): Promise<ChatMessage[]> =>
  invoke('chat_messages', { id, chat });

export const deleteMeetingChat = (id: string, chat: string): Promise<void> =>
  invoke('delete_meeting_chat', { id, chat });

export const askInChat = (id: string, chat: string, question: string): Promise<void> =>
  invoke('ask_in_chat', { id, chat, question });

export const getMeeting = (id: string): Promise<MeetingDetails> =>
  invoke('get_meeting', { id });

export const sessionState = (): Promise<SessionState> => invoke('session_state');

export const startSession = (meeting: MeetingStart): Promise<StartedMeeting> =>
  invoke('start_session', { meeting });

export const stopSession = (): Promise<void> => invoke('stop_session');

export const generate = (mode: GenerationMode): Promise<void> =>
  invoke('generate', { mode });

export const cancelGeneration = (): Promise<void> => invoke('cancel_generation');

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const finishSelection = (rect: SelectionRect): Promise<void> =>
  invoke('finish_selection', { rect });

export const cancelSelection = (): Promise<void> => invoke('cancel_selection');
