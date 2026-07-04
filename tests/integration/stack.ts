/** Shared helpers for integration tests that talk to the running compose stack. */
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
