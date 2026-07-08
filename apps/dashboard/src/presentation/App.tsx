import { useEffect, useState } from 'react';
import { loadDashboard } from './store/dashboardSlice';
import { useAppDispatch } from './store/store';
import { AppShell } from './components/layout/AppShell';
import { OverviewView } from './views/OverviewView';
import { SessionsView } from './views/SessionsView';
import { MissionRunsView } from './views/MissionRunsView';
import { SettingsView } from './views/SettingsView';
import { DocsView } from './views/DocsView';

export type ViewKey = 'overview' | 'sessions' | 'runs' | 'settings' | 'docs';

const ROUTES: Record<ViewKey, string> = {
  overview: '/overview',
  sessions: '/sessions',
  runs: '/mission-runs',
  settings: '/settings',
  docs: '/docs',
};

function viewFromPath(pathname: string): ViewKey {
  if (pathname === '/' || pathname === '/docs' || pathname.startsWith('/docs/')) return pathname.startsWith('/docs') ? 'docs' : 'overview';
  const match = (Object.entries(ROUTES) as Array<[ViewKey, string]>).find(([, path]) => path === pathname);
  return match?.[0] ?? 'overview';
}

export function App() {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<ViewKey>(() => viewFromPath(window.location.pathname));

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState(null, '', ROUTES.overview);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextView: ViewKey) => {
    setView(nextView);
    const nextPath = ROUTES[nextView];
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  };

  return (
    <AppShell activeView={view} routes={ROUTES} onViewChange={navigate}>
      {view === 'overview' && <OverviewView />}
      {view === 'sessions' && <SessionsView />}
      {view === 'runs' && <MissionRunsView />}
      {view === 'settings' && <SettingsView />}
      {view === 'docs' && <DocsView />}
    </AppShell>
  );
}
