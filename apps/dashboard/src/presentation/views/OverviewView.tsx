import { useState } from 'react';
import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { AppForm } from '@/presentation/components/apps/AppForm';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Modal } from '@/presentation/components/shared/Modal';
import { StatusPill } from '@/presentation/components/shared/StatusPill';
import { useAppFormController } from '@/presentation/hooks/useAppFormController';
import { openApp, removeApp } from '@/presentation/store/dashboardSlice';
import { useAppDispatch, useAppSelector } from '@/presentation/store/store';
import styles from './OverviewView.module.css';

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.25 12s3.5-6.75 9.75-6.75S21.75 12 21.75 12 18.25 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 4.75h5.25V10" />
      <path d="m13 11 6-6" />
      <path d="M10.25 6.75h-4.5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-4.5" />
    </svg>
  );
}

function hostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function OverviewView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const dispatch = useAppDispatch();
  const { apps, health, status, sessions } = useAppSelector((state) => state.dashboard);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
  const form = useAppFormController();

  const activeCount = sessions.filter((session) => session.state === 'running').length;
  const activeHealth = health?.components.filter((component) => !component.ok) ?? [];
  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? apps[0] ?? null;
  const deleteApp = apps.find((app) => app.id === deleteAppId) ?? null;
  const selectedSession = selectedApp
    ? sessions.find((session) => session.appId === selectedApp.id && session.state === 'running')
    : null;

  const openAppSession = async (appId: string, expand = false) => {
    const result = await dispatch(openApp(appId)).unwrap();
    setSelectedAppId(appId);
    if (expand) window.open(result.watchUrl, '_blank', 'noopener,noreferrer');
  };

  const previewApp = (appId: string, hasSession: boolean) => {
    setSelectedAppId(appId);
    if (!hasSession) void openAppSession(appId);
  };

  const modalTitle = form.isEditing
    ? `Edit ${form.editingApp?.name ?? 'observed app'}`
    : 'Register observed app';
  const modalDescription = form.isEditing
    ? 'Update the details for this observed app. Saving will refresh the dashboard.'
    : 'Register a new target so the shared browser can open it. All required fields must be valid.';

  return (
    <section ref={ref} className={styles.view}>
      <div className={styles.heading}>
        <div>
          <p>Observed browser control center</p>
          <h2>Overview</h2>
        </div>
        <div className={styles.headingActions}>
          {health ? <StatusPill value={health.status} /> : null}
          <button type="button" className={styles.addButton} onClick={form.openCreate}>
            + Add app
          </button>
        </div>
      </div>

      <div className={styles.operatingGrid}>
        <article className={styles.browserPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Observed windows</h3>
              <p>
                {activeCount
                  ? `${activeCount} observed session${activeCount === 1 ? '' : 's'} running`
                  : 'Open registered apps to create isolated visual sessions.'}
              </p>
            </div>
          </div>

          <div className={styles.livePreview} aria-label="Selected observed session preview">
            <div className={styles.previewHeader}>
              <div>
                <span>Selected workspace</span>
                <strong>{selectedApp?.name ?? 'No app selected'}</strong>
              </div>
              <div className={styles.previewActions}>
                {selectedApp ? (
                  <button
                    type="button"
                    aria-label={
                      selectedSession
                        ? 'Refresh selected session preview'
                        : 'Open selected app session'
                    }
                    title={
                      selectedSession
                        ? 'Refresh selected session preview'
                        : 'Open selected app session'
                    }
                    onClick={() => void openAppSession(selectedApp.id)}
                  >
                    <EyeIcon />
                  </button>
                ) : null}
                {selectedSession ? (
                  <button
                    type="button"
                    aria-label="Open selected session in a new tab"
                    title="Open selected session in a new tab"
                    onClick={() =>
                      window.open(selectedSession.novncUrl, '_blank', 'noopener,noreferrer')
                    }
                  >
                    <ExternalIcon />
                  </button>
                ) : null}
              </div>
            </div>
            {selectedSession ? (
              <iframe
                className={styles.previewFrame}
                src={selectedSession.novncUrl}
                title={`${selectedApp?.name ?? 'Selected app'} live noVNC preview`}
              />
            ) : (
              <div className={styles.previewEmpty}>
                <p>
                  {selectedApp
                    ? 'Open this app to start a live observed session.'
                    : 'Select or register an app to preview it here.'}
                </p>
              </div>
            )}
          </div>

          <div className={styles.windowGrid} aria-label="Observed browser windows">
            {apps.map((app) => {
              const session = sessions.find(
                (item) => item.appId === app.id && item.state === 'running',
              );
              return (
                <article
                  role="button"
                  tabIndex={0}
                  className={
                    app.id === selectedApp?.id
                      ? `${styles.miniWindow} ${styles.selectedWindow}`
                      : styles.miniWindow
                  }
                  key={app.id}
                  onClick={() => previewApp(app.id, Boolean(session))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      previewApp(app.id, Boolean(session));
                    }
                  }}
                  aria-label={session ? `Preview ${app.name}` : `Open and preview ${app.name}`}
                >
                  <div className={styles.windowBar}>
                    <span />
                    <span />
                    <span />
                    <strong>{session ? session.slot : 'idle'}</strong>
                  </div>
                  <div className={styles.windowBody}>
                    <p>{app.name}</p>
                    <small>{session?.targetUrl ?? 'Not open yet'}</small>
                    <div className={styles.windowActions}>
                      <button
                        type="button"
                        aria-label={
                          session
                            ? `Refresh preview for ${app.name}`
                            : `Open and preview ${app.name}`
                        }
                        title={session ? 'Refresh preview' : 'Open and preview'}
                        onClick={(event) => {
                          event.stopPropagation();
                          previewApp(app.id, Boolean(session));
                        }}
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={
                          session
                            ? `Open ${app.name} in a new tab`
                            : `Open ${app.name} session in a new tab`
                        }
                        title={session ? 'Open in new tab' : 'Open session in new tab'}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (session)
                            window.open(session.novncUrl, '_blank', 'noopener,noreferrer');
                          else void openAppSession(app.id, true);
                        }}
                      >
                        <ExternalIcon />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!apps.length ? <p className={styles.empty}>No observed apps registered yet.</p> : null}
          </div>
        </article>

        <aside className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>{selectedApp?.name ?? 'App details'}</h3>
              <p>{selectedSession ? 'Running in an observed session' : 'Registered, not open'}</p>
            </div>
          </div>
          {selectedApp ? (
            <>
              <dl className={styles.details}>
                <dt>Target URL</dt>
                <dd>{selectedApp.target_url}</dd>
                <dt>Session</dt>
                <dd>
                  {selectedSession ? `${selectedSession.id} (${selectedSession.slot})` : 'Not open'}
                </dd>
                <dt>Watch URL</dt>
                <dd>{selectedSession?.novncUrl ?? 'Created by backend when app opens'}</dd>
                <dt>CDP URL</dt>
                <dd>{selectedSession?.cdpUrl ?? 'Created by backend when app opens'}</dd>
                <dt>Run mode</dt>
                <dd>{selectedApp.run_mode}</dd>
                <dt>Viewport</dt>
                <dd>{`${selectedApp.default_viewport_width} x ${selectedApp.default_viewport_height}`}</dd>
                <dt>Hosts</dt>
                <dd>{selectedApp.allowed_hosts.join(', ') || hostname(selectedApp.target_url)}</dd>
              </dl>
              <div className={styles.detailActions}>
                <button type="button" onClick={() => form.openEdit(selectedApp)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => setDeleteAppId(selectedApp.id)}
                >
                  Delete
                </button>
              </div>
            </>
          ) : (
            <p className={styles.empty}>Register an app from Overview to enable navigation.</p>
          )}
        </aside>
      </div>

      <div className={styles.statusStrip}>
        <section>
          <span>Navigation scope</span>
          <div className={styles.hosts}>
            {status?.allowed_hosts.map((host) => <span key={host}>{host}</span>) ?? (
              <span>None loaded</span>
            )}
          </div>
        </section>
        <section>
          <span>System health</span>
          <p>
            {activeHealth.length
              ? `${activeHealth.length} component${activeHealth.length === 1 ? '' : 's'} degraded`
              : health
                ? 'All observer components healthy'
                : 'Health not loaded'}
          </p>
        </section>
      </div>

      <Modal
        open={form.isOpen}
        onClose={form.close}
        title={modalTitle}
        description={modalDescription}
        size="md"
        dismissDisabled={form.busy}
      >
        <AppForm
          editing={form.editingApp}
          fieldErrors={form.fieldErrors}
          submitError={form.submitError}
          busy={form.busy}
          onCancel={form.close}
          onSubmit={() => void form.submit()}
          onFieldChange={form.setField}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteApp)}
        title="Delete observed app"
        description="This removes the app from the local registry. Existing target applications are not stopped."
        target={deleteApp?.name}
        confirmLabel="Delete app"
        onCancel={() => setDeleteAppId(null)}
        onConfirm={() => {
          if (!deleteApp) return;
          void dispatch(removeApp(deleteApp.id));
          setDeleteAppId(null);
        }}
      />
    </section>
  );
}
