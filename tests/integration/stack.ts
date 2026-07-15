/** Shared helpers for integration tests that talk to the running compose stack. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export const API = `http://127.0.0.1:${process.env.RAVENEYE_API_PORT ?? 8090}`;
export const CDP = `http://127.0.0.1:${process.env.RAVENEYE_CDP_PORT ?? 9222}`;
export const NOVNC = `http://127.0.0.1:${process.env.RAVENEYE_NOVNC_PORT ?? 6080}`;

export async function requireStack(): Promise<void> {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`observer health returned ${res.status}`);
  } catch (err) {
    throw new Error('integration tests need the compose stack running (make up)', {
      cause: err,
    });
  }
}

export async function ensureSampleApp(): Promise<void> {
  await exec('docker', ['compose', '--profile', 'sample', 'up', '-d', 'sample-app'], {
    timeout: 120_000,
  });
}

type SessionInfo = {
  slot: string;
  cdp?: string;
  cdpUrl?: string;
  novncUrl?: string;
};

async function sessionUrl(path: '/cdp-info' | '/status', key: 'cdp' | 'novncUrl'): Promise<string> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  const body = await res.json();
  const sessions = body.sessions as SessionInfo[];
  const session = sessions.find((s) => s.slot === 'base') ?? sessions[0];
  const value = session?.[key] ?? session?.cdpUrl;
  if (typeof value !== 'string') throw new Error(`no ${key} session URL available`);
  return value;
}

export async function currentCdp(): Promise<string> {
  return sessionUrl('/cdp-info', 'cdp');
}

export async function currentNovnc(): Promise<string> {
  return sessionUrl('/status', 'novncUrl');
}
