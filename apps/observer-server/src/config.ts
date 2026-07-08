import { parseAllowedHosts } from '@raveneye/shared';

export interface ObserverConfig {
  display: string;
  targetUrl: string;
  allowedHosts: string[];
  viewportWidth: number;
  viewportHeight: number;
  profileMode: 'ephemeral' | 'persistent';
  headless: boolean;
  apiPort: number;
  /** Chromium's own CDP listener (loopback inside the container; socat republishes it). */
  cdpInternalPort: number;
  novncInternalPort: number;
  vncInternalPort: number;
  artifactsDir: string;
  dataDir: string;
  databasePath: string;
  dashboardDir: string;
  docsVaultDir: string;
  persistentProfileDir: string;
  /** Maximum number of concurrent dynamic app sessions. The base session is not counted. */
  maxSessions: number;
  /** Display (:N) assigned to the first dynamically-spawned session. */
  sessionDisplayStart: number;
  /** First x11vnc port for a dynamic session (loopback inside the container). */
  sessionVncPortStart: number;
  /** First noVNC/websockify port for a dynamic session (published on the host). */
  sessionNovncPortStart: number;
  /** First CDP port for a dynamic session (published on the host). */
  sessionCdpPortStart: number;
}

function intEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function loadConfig(): ObserverConfig {
  const profileMode = process.env.RAVENEYE_PROFILE_MODE === 'persistent' ? 'persistent' : 'ephemeral';
  const artifactsDir = process.env.RAVENEYE_ARTIFACTS_DIR ?? '/artifacts';
  const dataDir = process.env.RAVENEYE_DATA_DIR ?? `${artifactsDir}/data`;
  return {
    display: process.env.DISPLAY ?? ':99',
    targetUrl: process.env.RAVENEYE_TARGET_URL ?? 'http://sample-app:3000',
    allowedHosts: parseAllowedHosts(process.env.RAVENEYE_ALLOWED_HOSTS ?? ''),
    viewportWidth: intEnv('RAVENEYE_VIEWPORT_WIDTH', 1440),
    viewportHeight: intEnv('RAVENEYE_VIEWPORT_HEIGHT', 900),
    profileMode,
    headless: process.env.RAVENEYE_HEADLESS === 'true' || process.env.RAVENEYE_HEADLESS === '1',
    apiPort: 8090,
    cdpInternalPort: 9221,
    novncInternalPort: 6080,
    vncInternalPort: 5900,
    artifactsDir,
    dataDir,
    databasePath: process.env.RAVENEYE_DB_PATH ?? `${dataDir}/raveneye.sqlite`,
    dashboardDir: process.env.RAVENEYE_DASHBOARD_DIR ?? '/app/apps/dashboard/dist',
    docsVaultDir: process.env.RAVENEYE_DOCS_VAULT_DIR ?? '/app/docs-vault',
    persistentProfileDir: '/browser-profile/chromium',
    maxSessions: intEnv('RAVENEYE_MAX_SESSIONS', 10),
    sessionDisplayStart: intEnv('RAVENEYE_SESSION_DISPLAY_START', 98),
    sessionVncPortStart: intEnv('RAVENEYE_SESSION_VNC_PORT_START', 5901),
    sessionNovncPortStart: intEnv('RAVENEYE_SESSION_NOVNC_PORT_START', 6081),
    sessionCdpPortStart: intEnv('RAVENEYE_SESSION_CDP_PORT_START', 9223),
  };
}
