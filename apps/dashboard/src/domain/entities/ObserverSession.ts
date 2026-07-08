export type SessionState = 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';

export interface SessionPorts {
  display: string;
  vnc: number;
  novnc: number;
  cdp: number;
}

export interface ObserverSession {
  id: string;
  slot: string;
  appId: string;
  state: SessionState;
  ports: SessionPorts;
  targetUrl: string;
  allowedHosts?: string[];
  startedAt: string;
  stoppedAt: string | null;
  detail?: string | null;
  novncUrl: string;
  cdpUrl: string;
}

export interface OpenAppResult {
  detail: string;
  session: ObserverSession;
  watchUrl: string;
  cdpUrl: string;
}
