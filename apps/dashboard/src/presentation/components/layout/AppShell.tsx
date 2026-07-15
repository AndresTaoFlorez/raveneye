import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  PlaySquare,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { ViewKey } from '@/presentation/App';
import { clearMessage, loadDashboard } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './AppShell.module.css';

const views: Array<{ key: ViewKey; label: string; Icon: typeof LayoutDashboard }> = [
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { key: 'sessions', label: 'Sessions', Icon: PlaySquare },
  { key: 'runs', label: 'Runs', Icon: ClipboardList },
  { key: 'settings', label: 'Settings', Icon: Settings },
  { key: 'docs', label: 'Docs', Icon: BookOpen },
];

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />;
}

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? `${styles.shell} ${styles.collapsed}` : styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div>
            <p className={styles.kicker}>v0.2</p>
            <h1>RavenEye</h1>
          </div>
          <strong aria-hidden="true">RE</strong>
          <button
            type="button"
            className={styles.collapseButton}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>
        <nav className={styles.nav}>
          {views.map(({ Icon, ...view }) => (
            <a
              key={view.key}
              className={activeView === view.key ? styles.active : ''}
              href={routes[view.key]}
              onClick={(event) => {
                event.preventDefault();
                onViewChange(view.key);
              }}
              aria-label={view.label}
              title={view.label}
            >
              <span aria-hidden="true">
                <Icon />
              </span>
              <b>{view.label}</b>
            </a>
          ))}
        </nav>
        <div className={styles.links}>
          <button
            type="button"
            aria-label={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}
            title={loading ? 'Refreshing dashboard' : 'Refresh dashboard'}
            disabled={loading}
            onClick={() => void dispatch(loadDashboard())}
          >
            <RefreshCw aria-hidden="true" />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <a href="/health" target="_blank" rel="noreferrer">
            /health
          </a>
          <a href="/status" target="_blank" rel="noreferrer">
            /status
          </a>
          <a href="/api/docs" target="_blank" rel="noreferrer">
            docs API
          </a>
        </div>
      </aside>
      <main className={styles.main}>
        {(error || notice) && (
          <button
            className={error ? styles.error : styles.notice}
            type="button"
            onClick={() => dispatch(clearMessage())}
          >
            {error ?? notice}
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
