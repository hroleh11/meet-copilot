import type { CommandError } from '~/shared/ipc';

export function isCommandError(value: unknown): value is CommandError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

export function errorMessage(value: unknown, fallback: string): string {
  if (isCommandError(value)) {
    return value.message;
  }

  return value instanceof Error ? value.message : fallback;
}
