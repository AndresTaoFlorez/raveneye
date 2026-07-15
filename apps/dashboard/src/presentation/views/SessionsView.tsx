import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { stopSession } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './SessionsView.module.css';

export function SessionsView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const dispatch = useAppDispatch();
  const { sessions, apps } = useAppSelector((state) => state.dashboard);

  const appName = (appId: string) => apps.find((app) => app.id === appId)?.name ?? appId;

  return (
    <section ref={ref} className={styles.view}>
      <div className={styles.heading}>
        <div>
          <p>Observed sessions and visual workspaces.</p>
          <h2>Sessions</h2>
        </div>
        <span>{sessions.length} active</span>
      </div>

      <div className={styles.grid}>
        {sessions.map((session) => {
          const isBase = session.slot === 'base';
          return (
            <article className={styles.session} key={session.id}>
              <div className={styles.sessionHeader}>
                <div>
                  <p>{isBase ? 'Base session' : 'Dynamic app session'}</p>
                  <h3>{appName(session.appId)}</h3>
                </div>
                <span className={session.state === 'running' ? styles.running : styles.state}>
                  {session.state}
                </span>
              </div>
              <dl className={styles.details}>
                <dt>ID</dt>
                <dd>{session.id}</dd>
                <dt>Slot</dt>
                <dd>{session.slot}</dd>
                <dt>Display</dt>
                <dd>{session.ports.display}</dd>
                <dt>Target</dt>
                <dd>{session.targetUrl}</dd>
                <dt>Watch URL</dt>
                <dd>{session.novncUrl}</dd>
                <dt>CDP URL</dt>
                <dd>{session.cdpUrl}</dd>
              </dl>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => window.open(session.novncUrl, '_blank', 'noopener,noreferrer')}
                >
                  Watch
                </button>
                <a href={session.cdpUrl} target="_blank" rel="noreferrer">
                  CDP
                </a>
                {!isBase ? (
                  <button
                    type="button"
                    className={styles.danger}
                    onClick={() => void dispatch(stopSession(session.id))}
                  >
                    Stop session
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!sessions.length ? (
          <p className={styles.empty}>No active sessions reported by the backend.</p>
        ) : null}
      </div>
    </section>
  );
}
