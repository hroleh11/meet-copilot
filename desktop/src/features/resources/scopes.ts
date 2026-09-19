import type { ResourceScope } from '~/shared/ipc';

export const USER_RESOURCES: ResourceScope = { kind: 'user' };

export const STAGED_MEETING_RESOURCES: ResourceScope = { kind: 'meeting', id: null };

export function projectResources(id: string): ResourceScope {
  return { kind: 'project', id };
}
