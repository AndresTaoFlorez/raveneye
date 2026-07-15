import type { RunRepository } from '@/application/ports/RunRepository';
import type { MissionRun } from '@/domain/entities/MissionRun';
import type { ControlApiClient } from '@/infrastructure/http/controlApiClient';

export class ControlRunRepository implements RunRepository {
  constructor(private readonly client: ControlApiClient) {}

  async list(): Promise<MissionRun[]> {
    const data = await this.client.get<{ runs: MissionRun[] }>('/api/runs');
    return data.runs;
  }

  async get(runId: string): Promise<MissionRun> {
    const data = await this.client.get<{ run: MissionRun }>(
      `/api/runs/${encodeURIComponent(runId)}`,
    );
    return data.run;
  }
}
