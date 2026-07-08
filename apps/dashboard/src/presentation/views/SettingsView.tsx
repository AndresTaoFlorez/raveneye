import { useEffect, useState } from 'react';
import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { saveSettings } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './SettingsView.module.css';

export function SettingsView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const dispatch = useAppDispatch();
  const { health, status, settings } = useAppSelector((state) => state.dashboard);
  const [maxSessions, setMaxSessions] = useState('10');
  const degraded = health?.components.filter((component) => !component.ok) ?? [];

  useEffect(() => {
    if (settings) setMaxSessions(String(settings.max_dynamic_sessions));
  }, [settings]);

  const saveMaxSessions = () => {
    const value = Number(maxSessions);
    if (!Number.isInteger(value)) return;
    void dispatch(saveSettings({ max_dynamic_sessions: value }));
  };

  return (
    <section ref={ref} className={styles.view}>
      <div className={styles.heading}>
        <div>
          <p>Local diagnostics and observer contract.</p>
          <h2>Settings</h2>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.panel}>
          <h3>Session limits</h3>
          <label className={styles.field}>
            <span>Max dynamic app sessions</span>
            <input
              type="number"
              min="1"
              max="50"
              step="1"
              value={maxSessions}
              onChange={(event) => setMaxSessions(event.target.value)}
            />
          </label>
          <p className={styles.hint}>The base session does not count against this limit. Default is 10.</p>
          <button className={styles.saveButton} type="button" onClick={saveMaxSessions}>
            Save limit
          </button>
        </article>

        <article className={styles.panel}>
          <h3>Control surfaces</h3>
          <div className={styles.links}>
            <a href="/health" target="_blank" rel="noreferrer">Health JSON</a>
            <a href="/status" target="_blank" rel="noreferrer">Status JSON</a>
            <a href="/cdp-info" target="_blank" rel="noreferrer">CDP info</a>
            <a href="/api/runs" target="_blank" rel="noreferrer">Mission runs API</a>
          </div>
        </article>

        <article className={styles.panel}>
          <h3>Navigation policy</h3>
          <dl className={styles.details}>
            <dt>Target</dt>
            <dd>{status?.target_url ?? 'Not loaded'}</dd>
            <dt>Viewport</dt>
            <dd>{status ? `${status.viewport.width} x ${status.viewport.height}` : 'Not loaded'}</dd>
            <dt>Allowed hosts</dt>
            <dd>{status?.allowed_hosts.join(', ') || 'None loaded'}</dd>
          </dl>
        </article>

        <article className={styles.panel}>
          <h3>Diagnostics</h3>
          <p className={degraded.length ? styles.warn : styles.ok}>
            {degraded.length ? `${degraded.length} components degraded` : 'All loaded components are healthy'}
          </p>
          <div className={styles.components}>
            {health?.components.map((component) => (
              <div key={component.component}>
                <span className={component.ok ? styles.dotOk : styles.dotWarn} />
                <strong>{component.component}</strong>
                <small>{component.detail}</small>
              </div>
            )) ?? <p>Health not loaded.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
