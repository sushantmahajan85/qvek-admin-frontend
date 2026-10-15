import { clearSession, getAccessToken, getRefreshToken, setSession } from './auth-session';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function refresh(): Promise<boolean> {
  const token = getRefreshToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: token }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as {
      data: { accessToken: string; refreshToken: string };
    };
    setSession(json.data.accessToken, json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  if (res.status === 401 && !retried && getRefreshToken()) {
    if (await refresh()) return request<T>(path, init, true);
    clearSession();
    // Session truly dead (refresh expired/revoked) — back to login.
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    code?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new ApiError(json.code ?? 'INTERNAL_ERROR', json.message ?? 'Request failed', res.status);
  }
  return (json.data ?? json) as T;
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
