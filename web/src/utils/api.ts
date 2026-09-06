/**
 * api.ts — Authenticated API wrapper for Bento Dashboard
 *
 * When `bento ui --network` is active, the server generates a random token
 * and appends `?token=<value>` to the URL it prints. This module reads that
 * token on first load, persists it in localStorage, and automatically injects
 * it into every request so the UI continues to work across page refreshes.
 *
 * Loopback (127.0.0.1 / localhost) requests are always exempted on the server
 * side, so regular local-only usage requires no token at all.
 */

const STORAGE_KEY = 'bento_auth_token';

/**
 * Read token from URL `?token=` on first load and persist it to localStorage.
 * Call this once from App.tsx on mount.
 */
export function initAuthToken(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem(STORAGE_KEY, urlToken);
      // Strip token from URL bar without triggering a navigation
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', cleanUrl);
    }
  } catch {
    // Silently ignore — SSR / test environments without window.location
  }
}

/** Return the stored auth token, or null if none. */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Drop-in replacement for `fetch()` that injects the Bento auth token header
 * when one is available.
 *
 * Usage:
 *   import { apiFetch } from '../utils/api';
 *   const res = await apiFetch('/api/status');
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  if (token) {
    const headers = new Headers(init.headers);
    headers.set('X-Bento-Token', token);
    return fetch(url, { ...init, headers });
  }
  return fetch(url, init);
}

/**
 * Build an EventSource URL with the auth token appended as a query parameter.
 * EventSource does not support custom headers, so the token must be in the URL.
 *
 * Usage:
 *   const src = new EventSource(authEventSourceUrl(`/api/bg/${id}/stream`));
 */
export function authEventSourceUrl(path: string): string {
  const token = getAuthToken();
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}
