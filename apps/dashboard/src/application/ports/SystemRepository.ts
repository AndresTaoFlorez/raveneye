import type {
  HealthReport,
  ObserverStatus,
  RavenEyeSettings,
} from '@/domain/entities/SystemStatus';
import type { ObserverSession } from '@/domain/entities/ObserverSession';

export interface SystemRepository {
  health(): Promise<HealthReport>;
  status(): Promise<ObserverStatus>;
  settings(): Promise<RavenEyeSettings>;
  updateSettings(settings: Partial<RavenEyeSettings>): Promise<RavenEyeSettings>;
  resizeSessionViewport(id: string, viewport: { width: number; height: number }): Promise<ObserverSession>;
  stopSession(id: string): Promise<ObserverSession>;
}
