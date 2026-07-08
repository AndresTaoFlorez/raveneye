import type { ObserverSession } from './ObserverSession';

export type RunMode = 'host' | 'container';

export interface ObservedApp {
  id: string;
  name: string;
  description: string | null;
  target_url: string;
  allowed_hosts: string[];
  local_repo_path: string | null;
  run_mode: RunMode;
  default_viewport_width: number;
  default_viewport_height: number;
  created_at: string;
  updated_at: string;
  sessions?: ObserverSession[];
}

export interface ObservedAppDraft {
  name: string;
  description: string;
  target_url: string;
  allowed_hosts: string[];
  local_repo_path: string;
  run_mode: RunMode;
  default_viewport_width: number;
  default_viewport_height: number;
}

export const emptyAppDraft = (): ObservedAppDraft => ({
  name: '',
  description: '',
  target_url: 'http://host.docker.internal:3000',
  allowed_hosts: ['host.docker.internal'],
  local_repo_path: '',
  run_mode: 'host',
  default_viewport_width: 1440,
  default_viewport_height: 900,
});

export const toAppDraft = (app: ObservedApp): ObservedAppDraft => ({
  name: app.name,
  description: app.description ?? '',
  target_url: app.target_url,
  allowed_hosts: app.allowed_hosts,
  local_repo_path: app.local_repo_path ?? '',
  run_mode: app.run_mode,
  default_viewport_width: app.default_viewport_width,
  default_viewport_height: app.default_viewport_height,
});
