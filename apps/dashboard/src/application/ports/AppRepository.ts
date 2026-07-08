import type { ObservedApp, ObservedAppDraft } from '@/domain/entities/ObservedApp';
import type { OpenAppResult } from '@/domain/entities/ObserverSession';

export interface AppRepository {
  list(): Promise<ObservedApp[]>;
  create(app: ObservedAppDraft): Promise<ObservedApp>;
  update(id: string, app: ObservedAppDraft): Promise<ObservedApp>;
  delete(id: string): Promise<void>;
  open(id: string): Promise<OpenAppResult>;
}
