import type { AppRepository } from '@/application/ports/AppRepository';
import type { ObservedApp, ObservedAppDraft } from '@/domain/entities/ObservedApp';
import type { OpenAppResult } from '@/domain/entities/ObserverSession';

export const listAppsUseCase = (repo: AppRepository): Promise<ObservedApp[]> => repo.list();

export const createAppUseCase = (
  repo: AppRepository,
  draft: ObservedAppDraft,
): Promise<ObservedApp> => repo.create(draft);

export const updateAppUseCase = (
  repo: AppRepository,
  id: string,
  draft: ObservedAppDraft,
): Promise<ObservedApp> => repo.update(id, draft);

export const submitAppUseCase = (
  repo: AppRepository,
  payload: { id?: string; draft: ObservedAppDraft },
): Promise<ObservedApp> =>
  payload.id ? repo.update(payload.id, payload.draft) : repo.create(payload.draft);

export const deleteAppUseCase = (repo: AppRepository, id: string): Promise<void> => repo.delete(id);

export const openAppUseCase = (repo: AppRepository, id: string): Promise<OpenAppResult> => repo.open(id);
