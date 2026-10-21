// Admin session helpers for the UI. The real session (JWT access + refresh token) lives in lib/auth-session.ts;
// this adds a subscription so the authenticated layout reacts to sign-out in this tab and in other tabs.
import { clearSession, hasSession } from '@/lib/auth-session';

const listeners = new Set<() => void>();

export const isAuthed = hasSession;

export function signOut() {
  clearSession();
  listeners.forEach((fn) => fn());
}

export function subscribeAuth(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith('qvek_admin')) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}
