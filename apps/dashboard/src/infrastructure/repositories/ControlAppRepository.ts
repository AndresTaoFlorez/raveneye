import type { AppRepository } from '@/application/ports/AppRepository';
import type { ObservedApp, ObservedAppDraft } from '@/domain/entities/ObservedApp';
import type { OpenAppResult } from '@/domain/entities/ObserverSession';
import type { ControlApiClient } from '@/infrastructure/http/controlApiClient';

export class ControlAppRepository implements AppRepository {
  constructor(private readonly client: ControlApiClient) {}

  async list(): Promise<ObservedApp[]> {
    const data = await this.client.get<{ apps: ObservedApp[] }>('/api/apps');
    return data.apps;
  }

  async create(app: ObservedAppDraft): Promise<ObservedApp> {
    const data = await this.client.post<{ app: ObservedApp }>('/api/apps', app);
    return data.app;
  }

  async update(id: string, app: ObservedAppDraft): Promise<ObservedApp> {
    const data = await this.client.patch<{ app: ObservedApp }>(
      `/api/apps/${encodeURIComponent(id)}`,
      app,
    );
    return data.app;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(`/api/apps/${encodeURIComponent(id)}`);
  }

  async open(id: string): Promise<OpenAppResult> {
    return this.client.post<OpenAppResult>(`/api/apps/${encodeURIComponent(id)}/open`);
  }
}
