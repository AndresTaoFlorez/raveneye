export interface ConsoleEntry {
  ts: string;
  kind: 'console' | 'page-error';
  level: string;
  text: string;
  page_url: string;
  location?: string;
}

export interface NetworkEntry {
  ts: string;
  method: string;
  url: string;
  resource_type: string;
  status?: number;
  ok?: boolean;
  failure?: string;
  duration_ms?: number;
  request_headers?: Record<string, string>;
  response_headers?: Record<string, string>;
}

export function isNetworkProblem(entry: NetworkEntry): boolean {
  if (entry.failure) return true;
  if (entry.status !== undefined && entry.status >= 400) return true;
  return false;
}
