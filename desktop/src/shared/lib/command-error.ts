import { uk } from '~/shared/i18n/uk';
import type { BackendFailure, CommandError, ErrorKind } from '~/shared/ipc';

const BY_FAILURE: Record<BackendFailure, string> = {
  unauthorized: uk.errors.unauthorized,
  notFound: uk.errors.notFound,
  conflict: uk.errors.conflict,
  unavailable: uk.errors.unavailable,
  unexpected: uk.errors.unexpected,
};

const BY_KIND: Partial<Record<ErrorKind, string>> = {
  permission: uk.errors.permission,
  access: uk.errors.access,
  cancelled: uk.errors.cancelled,
};

export function isCommandError(value: unknown): value is CommandError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'message' in value &&
    typeof (value as { message: unknown }).message === 'string'
  );
}

export function errorMessage(
  value: unknown,
  fallback: string,
  overrides: Partial<Record<BackendFailure, string>> = {},
): string {
  if (!isCommandError(value)) {
    return fallback;
  }

  if (value.failure) {
    return overrides[value.failure] ?? BY_FAILURE[value.failure];
  }

  return BY_KIND[value.kind] ?? fallback;
}
