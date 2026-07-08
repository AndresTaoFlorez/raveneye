import type { MissionRun } from '@/domain/entities/MissionRun';

export interface RunRepository {
  list(): Promise<MissionRun[]>;
  get(runId: string): Promise<MissionRun>;
}
