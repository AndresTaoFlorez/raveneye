import type { MissionRun } from '@/domain/entities/MissionRun';
import { StatusPill } from '@/presentation/components/shared/StatusPill';
import styles from './RunList.module.css';

export function RunList({ runs }: { runs: MissionRun[] }) {
  if (runs.length === 0) {
    return <div className={styles.empty}>No mission runs found in artifacts/runs.</div>;
  }

  return (
    <div className={styles.table}>
      <div className={styles.header}>
        <span>Run</span>
        <span>Status</span>
        <span>Findings</span>
        <span>Report</span>
      </div>
      {runs.map((run) => (
        <article key={run.run_id} className={styles.row}>
          <div>
            <strong>{run.manifest?.mission_name ?? run.run_id}</strong>
            <small>{run.manifest?.target_url ?? run.path}</small>
          </div>
          <span>
            {run.manifest?.status ? <StatusPill value={run.manifest.status} /> : 'unknown'}
          </span>
          <span>{run.finding_count ?? 'unknown'}</span>
          <span>{run.report_path ?? 'No report.md'}</span>
        </article>
      ))}
    </div>
  );
}
