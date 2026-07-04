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
  persistentProfileDir: string;
}

function intEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function loadConfig(): ObserverConfig {
  const profileMode = process.env.RAVENEYE_PROFILE_MODE === 'persistent' ? 'persistent' : 'ephemeral';
  return {
    display: process.env.DISPLAY ?? ':99',
    targetUrl: process.env.RAVENEYE_TARGET_URL ?? 'http://sample-app:3000',
    allowedHosts: parseAllowedHosts(
      process.env.RAVENEYE_ALLOWED_HOSTS ?? 'sample-app,host.docker.internal,localhost,127.0.0.1',
    ),
    viewportWidth: intEnv('RAVENEYE_VIEWPORT_WIDTH', 1440),
    viewportHeight: intEnv('RAVENEYE_VIEWPORT_HEIGHT', 900),
    profileMode,
    headless: process.env.RAVENEYE_HEADLESS === 'true' || process.env.RAVENEYE_HEADLESS === '1',
    apiPort: 8090,
    cdpInternalPort: 9221,
    novncInternalPort: 6080,
    vncInternalPort: 5900,
    artifactsDir: process.env.RAVENEYE_ARTIFACTS_DIR ?? '/artifacts',
    persistentProfileDir: '/browser-profile/chromium',
  };
}
