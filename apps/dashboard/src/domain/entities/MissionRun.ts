export interface RunManifestSummary {
  run_id?: string;
  mission_name?: string;
  status?: string;
  target_url?: string;
  started_at?: string;
  completed_at?: string;
}

export interface MissionRun {
  run_id: string;
  path: string;
  updated_at: string;
  manifest: RunManifestSummary | null;
  finding_count: number | null;
  report_path: string | null;
}
