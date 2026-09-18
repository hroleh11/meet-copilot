export type AccessState = { allowed: true } | { allowed: false; reason: string };

export function useAccess(): AccessState {
  return { allowed: true };
}
