const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export async function apiFetch<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    token?: string | null;
  } = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      (err as { message?: string }).message ?? 'Error de servidor',
    );
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
