import type { ReactNode } from 'react';
import type { ViewKey } from '@/presentation/App';
import { clearMessage, loadDashboard } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './AppShell.module.css';

const views: Array<{ key: ViewKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'runs', label: 'Mission Runs' },
  { key: 'settings', label: 'Settings' },
  { key: 'docs', label: 'Docs' },
];

export function AppShell({
  activeView,
  routes,
  onViewChange,
  children,
}: {
  activeView: ViewKey;
  routes: Record<ViewKey, string>;
  onViewChange: (view: ViewKey) => void;
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { error, notice, loading } = useAppSelector((state) => state.dashboard);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <p className={styles.kicker}>RavenEye v0.2</p>
          <h1>Local Dashboard</h1>
        </div>
        <nav className={styles.nav}>
          {views.map((view) => (
            <a
              key={view.key}
              className={activeView === view.key ? styles.active : ''}
              href={routes[view.key]}
              onClick={(event) => {
                event.preventDefault();
                onViewChange(view.key);
              }}
            >
              {view.label}
            </a>
          ))}
        </nav>
        <div className={styles.links}>
          <a href="/health" target="_blank" rel="noreferrer">/health</a>
          <a href="/status" target="_blank" rel="noreferrer">/status</a>
          <a href="/api/docs" target="_blank" rel="noreferrer">docs API</a>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.toolbar}>
          <button
            type="button"
            aria-label={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}
            title={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}
            disabled={loading}
            onClick={() => void dispatch(loadDashboard())}
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </header>
        {(error || notice) && (
          <button className={error ? styles.error : styles.notice} type="button" onClick={() => dispatch(clearMessage())}>
            {error ?? notice}
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
