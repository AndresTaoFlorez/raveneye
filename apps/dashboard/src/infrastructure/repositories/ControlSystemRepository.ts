import type { SystemRepository } from '@/application/ports/SystemRepository';
import type { ObserverSession } from '@/domain/entities/ObserverSession';
import type {
  HealthReport,
  ObserverStatus,
  RavenEyeSettings,
} from '@/domain/entities/SystemStatus';
import type { ControlApiClient } from '@/infrastructure/http/controlApiClient';

export class ControlSystemRepository implements SystemRepository {
  constructor(private readonly client: ControlApiClient) {}

  health(): Promise<HealthReport> {
    return this.client.get<HealthReport>('/health');
  }

  status(): Promise<ObserverStatus> {
    return this.client.get<ObserverStatus>('/status');
  }

  async settings(): Promise<RavenEyeSettings> {
    const data = await this.client.get<{ settings: RavenEyeSettings }>('/api/settings');
    return data.settings;
  }

  async updateSettings(settings: Partial<RavenEyeSettings>): Promise<RavenEyeSettings> {
    const data = await this.client.patch<{ settings: RavenEyeSettings }>('/api/settings', settings);
    return data.settings;
  }

  async stopSession(id: string): Promise<ObserverSession> {
    const data = await this.client.delete<{ session: ObserverSession }>(
      `/api/sessions/${encodeURIComponent(id)}`,
    );
    return data.session;
  }
}
