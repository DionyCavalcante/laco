// Em dev o Vite proxy redireciona /api → backend. Em prod é same-origin.
const BASE_URL = '';

export function getApiKey(): string {
  return localStorage.getItem('laco_api_key') || '';
}

export function getToken(): string {
  return localStorage.getItem('token') || '';
}

function buildHeaders(): HeadersInit {
  const token = getToken();
  const apiKey = getApiKey();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  } else if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...buildHeaders(), ...(options?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
