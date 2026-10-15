'use client';

// Admin session. Tokens persist in localStorage so a page reload keeps you logged in
// (in-memory-only died with the tab, causing UNAUTHENTICATED on every refresh).
// Tradeoff, accepted for internal MVP: XSS could read them — mitigated by the CSP
// headers the API sends and no third-party scripts on this panel.
// A plain `qvek_admin=1` cookie (no token inside) lets middleware guard / routes.

const ACCESS_KEY = 'qvek_admin_access';
const REFRESH_KEY = 'qvek_admin_refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let hydrated = false;

function read(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  accessToken ??= read(ACCESS_KEY);
  refreshToken ??= read(REFRESH_KEY);
}

export function setSession(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  hydrated = true;
  try {
    window.localStorage.setItem(ACCESS_KEY, access);
    window.localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* private mode — session lasts for the tab only */
  }
  document.cookie = 'qvek_admin=1; path=/; max-age=604800; SameSite=Lax';
}

export function clearSession() {
  accessToken = null;
  refreshToken = null;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* noop */
  }
  document.cookie = 'qvek_admin=; path=/; max-age=0; SameSite=Lax';
}

export function getAccessToken() {
  hydrate();
  return accessToken;
}

export function getRefreshToken() {
  hydrate();
  return refreshToken;
}
