/**
 * api.ts
 *
 * Centralised fetch wrapper.
 * - Strips trailing slash from VITE_BACKEND_URL so /migrate/... never becomes //migrate/...
 * - Automatically sets Content-Type: application/json for POST bodies
 * - Throws on non-2xx responses with the server's message
 */

// Remove trailing slash once at module load — not per request
export const BASE_URL = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  credentials?: RequestCredentials;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const { method = 'GET', body, credentials = 'include' } = options;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data: json.data ?? json };
}
