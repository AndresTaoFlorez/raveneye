import { useEffect, useState } from 'react';
import { toAppDraft } from '@/domain/entities/ObservedApp';
import type { ObserverSession } from '@/domain/entities/ObserverSession';
import { useEntranceAnimation } from '@/presentation/animations/useEntranceAnimation';
import { AppForm } from '@/presentation/components/apps/AppForm';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Modal } from '@/presentation/components/shared/Modal';
import { StatusPill } from '@/presentation/components/shared/StatusPill';
import { useAppFormController } from '@/presentation/hooks/useAppFormController';
import {
  openApp,
  removeApp,
  resizeSessionViewport,
  saveApp,
} from '@/presentation/store/dashboardSlice';
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

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.75 6.75 17.25 17.25" />
      <path d="m17.25 6.75-10.5 10.5" />
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

function formatTime(value?: string): string {
  if (!value) return 'Not started';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appFromSession(session: ObserverSession) {
  const host = hostname(session.targetUrl);
  return {
    id: session.appId,
    name: session.slot === 'base' ? 'Configured Target' : host ?? session.appId,
    description: session.owner?.label ?? null,
    target_url: session.targetUrl,
    allowed_hosts: session.allowedHosts ?? (host ? [host] : []),
    local_repo_path: null,
    run_mode: 'host' as const,
    default_viewport_width: 1440,
    default_viewport_height: 900,
    created_at: session.startedAt,
    updated_at: session.startedAt,
    sessions: [session],
  };
}

export function OverviewView() {
  const ref = useEntranceAnimation<HTMLElement>();
  const dispatch = useAppDispatch();
  const { apps, health, status, sessions } = useAppSelector((state) => state.dashboard);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [deleteAppId, setDeleteAppId] = useState<string | null>(null);
  const [viewportDraft, setViewportDraft] = useState({ width: '', height: '' });
  const [viewportSaving, setViewportSaving] = useState(false);
  const form = useAppFormController();

  const firstRunningSession = sessions.find((session) => session.state === 'running') ?? null;
  const activeCount = sessions.filter((session) => session.state === 'running').length;
  const activeHealth = health?.components.filter((component) => !component.ok) ?? [];
  const sessionOnlyApps = sessions
    .filter((session) => !apps.some((app) => app.id === session.appId))
    .map(appFromSession);
  const observableApps = [...apps, ...sessionOnlyApps];
  const selectedApp =
    observableApps.find((app) => app.id === selectedAppId) ??
    observableApps.find((app) => app.id === firstRunningSession?.appId) ??
    observableApps[0] ??
    null;
  const selectedAppIsRegistered = Boolean(
    selectedApp && apps.some((app) => app.id === selectedApp.id),
  );
  const deleteApp = apps.find((app) => app.id === deleteAppId) ?? null;
  const selectedSession = selectedApp
    ? sessions.find((session) => session.appId === selectedApp.id && session.state === 'running')
    : null;
  const activeUrl = selectedSession?.targetUrl ?? selectedApp?.target_url ?? status?.target_url ?? 'No target';
  const activeHost = activeUrl === 'No target' ? 'No target' : hostname(activeUrl) ?? activeUrl;
  const agentState = selectedSession?.state ?? (selectedApp ? 'idle' : 'waiting');
  const agentStateLabel =
    agentState === 'running' ? 'Live' : agentState === 'idle' ? 'Ready' : 'Waiting';
  const selfObservation = activeUrl.includes('127.0.0.1:8090') || activeUrl.includes('localhost:8090');

  useEffect(() => {
    if (!selectedApp) {
      setViewportDraft({ width: '', height: '' });
      return;
    }
    setViewportDraft({
      width: String(selectedApp.default_viewport_width),
      height: String(selectedApp.default_viewport_height),
    });
  }, [selectedApp?.id, selectedApp?.default_viewport_width, selectedApp?.default_viewport_height]);

  const openAppSession = async (appId: string, expand = false) => {
    if (!apps.some((app) => app.id === appId)) return;
    const result = await dispatch(openApp(appId)).unwrap();
    setSelectedAppId(appId);
    if (expand) window.open(result.watchUrl, '_blank', 'noopener,noreferrer');
  };

  const previewApp = (appId: string, hasSession: boolean) => {
    setSelectedAppId(appId);
    if (!hasSession) void openAppSession(appId);
  };

  const commitViewport = async () => {
    if (!selectedApp || !selectedAppIsRegistered || viewportSaving) return;
    const width = Number(viewportDraft.width);
    const height = Number(viewportDraft.height);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 320 ||
      width > 3840 ||
      height < 240 ||
      height > 2160
    ) {
      setViewportDraft({
        width: String(selectedApp.default_viewport_width),
        height: String(selectedApp.default_viewport_height),
      });
      return;
    }
    if (
      width === selectedApp.default_viewport_width &&
      height === selectedApp.default_viewport_height
    )
      return;
    setViewportSaving(true);
    try {
      await dispatch(
        saveApp({
          id: selectedApp.id,
          draft: {
            ...toAppDraft(selectedApp),
            default_viewport_width: width,
            default_viewport_height: height,
          },
        }),
      ).unwrap();
      if (selectedSession) {
        await dispatch(resizeSessionViewport({ id: selectedSession.id, width, height })).unwrap();
      }
    } finally {
      setViewportSaving(false);
    }
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
          <p>Agent observation cockpit</p>
          <h2>Overview</h2>
        </div>
        <div className={styles.headingActions}>
          {health ? <StatusPill value={health.status} /> : null}
        </div>
      </div>

      <div className={styles.operatingGrid}>
        <article className={styles.browserPanel}>
          <div className={styles.livePreview} aria-label="Selected observed session preview">
            <div className={styles.previewHeader}>
              <div>
                <span>Live noVNC view</span>
                <strong>{selectedApp?.name ?? 'No app selected'}</strong>
              </div>
              <div className={styles.previewActions}>
                {selectedApp && selectedAppIsRegistered ? (
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
            {selfObservation ? (
              <div className={styles.selfNotice}>
                RavenEye is observing its own dashboard, so the preview may mirror itself.
              </div>
            ) : null}
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

          <div className={styles.panelHeader}>
            <div>
              <h3>Observable targets</h3>
              <p>
                {activeCount
                  ? `${activeCount} observed session${activeCount === 1 ? '' : 's'} running`
                  : 'Open a target to watch the browser the agent controls.'}
              </p>
            </div>
            <button type="button" className={styles.addButton} onClick={form.openCreate}>
              <PlusIcon />
              <span>Add app</span>
            </button>
          </div>
          <div className={styles.windowGrid} aria-label="Observed browser windows">
            {observableApps.map((app) => {
              const isRegisteredApp = apps.some((item) => item.id === app.id);
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
                    <div>
                      <span className={session ? styles.windowLive : styles.windowIdle} />
                      <strong>{session ? session.slot : 'idle'}</strong>
                    </div>
                    <div className={styles.windowBarActions}>
                      {isRegisteredApp ? (
                        <button
                          type="button"
                          aria-label={`Delete ${app.name}`}
                          title="Delete"
                          className={styles.windowDeleteButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteAppId(app.id);
                          }}
                        >
                          <CloseIcon />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className={styles.windowBody}>
                    <div>
                      <p>{app.name}</p>
                      <small>{hostname(session?.targetUrl ?? app.target_url) ?? 'Not open yet'}</small>
                    </div>
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
            {!observableApps.length ? (
              <p className={styles.empty}>No observed apps registered yet.</p>
            ) : null}
          </div>
        </article>

        <aside className={styles.detailPanel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Agent signals</h3>
              <p>{selectedApp?.name ?? 'Select a target to inspect what the agent can see.'}</p>
            </div>
          </div>
          {selectedApp ? (
            <>
              <div className={styles.focusBar} aria-label="Current observed browser state">
                <div>
                  <span>Agent state</span>
                  <strong>
                    <i className={selectedSession ? styles.liveDot : styles.idleDot} />
                    {agentStateLabel}
                  </strong>
                </div>
                <div>
                  <span>Watching</span>
                  <strong title={activeUrl}>{activeHost}</strong>
                </div>
                <div className={styles.editableSignal}>
                  <span>Viewport</span>
                  <div className={styles.inlineViewport}>
                    <label>
                      <em>W</em>
                      <input
                        value={viewportDraft.width}
                        inputMode="numeric"
                        aria-label="Viewport width"
                        disabled={!selectedApp || !selectedAppIsRegistered || viewportSaving}
                        onChange={(event) =>
                          setViewportDraft((current) => ({
                            ...current,
                            width: event.target.value.replace(/\D/g, '').slice(0, 4),
                          }))
                        }
                        onBlur={() => void commitViewport()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                          if (event.key === 'Escape' && selectedApp) {
                            setViewportDraft({
                              width: String(selectedApp.default_viewport_width),
                              height: String(selectedApp.default_viewport_height),
                            });
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </label>
                    <i aria-hidden="true">x</i>
                    <label>
                      <em>H</em>
                      <input
                        value={viewportDraft.height}
                        inputMode="numeric"
                        aria-label="Viewport height"
                        disabled={!selectedApp || !selectedAppIsRegistered || viewportSaving}
                        onChange={(event) =>
                          setViewportDraft((current) => ({
                            ...current,
                            height: event.target.value.replace(/\D/g, '').slice(0, 4),
                          }))
                        }
                        onBlur={() => void commitViewport()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                          if (event.key === 'Escape' && selectedApp) {
                            setViewportDraft({
                              width: String(selectedApp.default_viewport_width),
                              height: String(selectedApp.default_viewport_height),
                            });
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <span>Session</span>
                  <strong>{selectedSession ? selectedSession.slot : 'not open'}</strong>
                </div>
              </div>
              <div className={styles.signalStack}>
                <section>
                  <span>Visual certainty</span>
                  <strong>{selectedSession ? 'live browser attached' : 'target registered'}</strong>
                  <p>
                    {selectedSession
                      ? `Started ${formatTime(selectedSession.startedAt)}. Watch URL is backend-owned.`
                      : 'Open the target to create a watched browser session.'}
                  </p>
                </section>
                <section>
                  <span>System health</span>
                  <strong>{health?.status ?? 'unknown'}</strong>
                  <p>
                    {activeHealth.length
                      ? activeHealth.map((component) => component.component).join(', ')
                      : 'All observer components report healthy.'}
                  </p>
                </section>
                <section>
                  <span>Self-observation</span>
                  <strong>{selfObservation ? 'active' : 'clear'}</strong>
                  <p>
                    {selfObservation
                      ? 'The mirror effect is expected while RavenEye watches RavenEye.'
                      : 'The preview is focused on an external target.'}
                  </p>
                </section>
              </div>
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
                <dt>Hosts</dt>
                <dd>{selectedApp.allowed_hosts.join(', ') || hostname(selectedApp.target_url)}</dd>
              </dl>
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
          <span>Registered targets</span>
          <p>{apps.length}</p>
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
