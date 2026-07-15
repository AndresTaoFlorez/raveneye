import type { SystemRepository } from '@/application/ports/SystemRepository';
import type { ObserverSession } from '@/domain/entities/ObserverSession';
import type { RavenEyeSettings } from '@/domain/entities/SystemStatus';

export const loadOverviewUseCase = async (repo: SystemRepository) => ({
  health: await repo.health(),
  status: await repo.status(),
  settings: await repo.settings(),
});

export const stopSessionUseCase = (repo: SystemRepository, id: string): Promise<ObserverSession> =>
  repo.stopSession(id);

export const updateSettingsUseCase = (
  repo: SystemRepository,
  settings: Partial<RavenEyeSettings>,
): Promise<RavenEyeSettings> => repo.updateSettings(settings);

export const resizeSessionViewportUseCase = (
  repo: SystemRepository,
  id: string,
  viewport: { width: number; height: number },
): Promise<ObserverSession> => repo.resizeSessionViewport(id, viewport);
