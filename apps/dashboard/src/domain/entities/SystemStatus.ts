import type { ObserverSession } from './ObserverSession';

export interface HealthReport {
  status: 'ok' | 'degraded';
  components: Array<{ component: string; ok: boolean; detail: string }>;
}

export interface ObserverStatus {
  observer_version: string;
  profile_mode: string;
  target_url: string;
  allowed_hosts: string[];
  viewport: { width: number; height: number };
  pages?: string[];
  sessions: ObserverSession[];
}

export interface RavenEyeSettings {
  max_dynamic_sessions: number;
}
