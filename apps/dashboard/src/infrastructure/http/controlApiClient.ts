import { DashboardError } from '@/domain/errors/DashboardError';

export class ControlApiClient {
  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const res = await fetch(path, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
    if (!res.ok) {
      throw new DashboardError(data.detail ?? data.error ?? `Request failed with ${res.status}`);
    }
    return data as T;
  }
}
