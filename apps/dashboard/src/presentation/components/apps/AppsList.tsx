import type { ObservedApp } from '@/domain/entities/ObservedApp';
import styles from './AppsList.module.css';

export function AppsList({
  apps,
  onEdit,
  onDelete,
  onOpen,
  onWatch,
  onStop,
}: {
  apps: ObservedApp[];
  onEdit: (app: ObservedApp) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onWatch: (url: string) => void;
  onStop: (id: string) => void;
}) {
  if (apps.length === 0) {
    return <div className={styles.empty}>No observed apps registered yet.</div>;
  }

  return (
    <div className={styles.list}>
      {apps.map((app) => {
        const running = app.sessions?.find((session) => session.state === 'running') ?? null;
        return (
        <article key={app.id} className={styles.item}>
          <div className={styles.content}>
            <h3>{app.name}</h3>
            <p>{app.description || app.target_url}</p>
            <div className={styles.meta}>
              <span>{app.run_mode}</span>
              <span>{`${app.default_viewport_width} x ${app.default_viewport_height}`}</span>
              <span>{running ? `session ${running.slot}` : 'no active session'}</span>
              <span>{app.allowed_hosts.join(', ') || 'No app-specific hosts'}</span>
            </div>
            {running ? (
              <dl className={styles.sessionDetails}>
                <dt>Watch URL</dt>
                <dd>{running.novncUrl}</dd>
                <dt>CDP URL</dt>
                <dd>{running.cdpUrl}</dd>
              </dl>
            ) : null}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => onOpen(app.id)}>Open app</button>
            {running ? (
              <>
                <button type="button" onClick={() => onWatch(running.novncUrl)}>Watch</button>
                <button type="button" onClick={() => onStop(running.id)}>Stop session</button>
              </>
            ) : null}
            <button type="button" onClick={() => onEdit(app)}>Edit</button>
            <button type="button" onClick={() => onDelete(app.id)}>Delete</button>
          </div>
        </article>
      );
      })}
    </div>
  );
}
