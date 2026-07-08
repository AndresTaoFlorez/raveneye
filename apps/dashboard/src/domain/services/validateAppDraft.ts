import { type ObservedAppDraft } from '@/domain/entities/ObservedApp';

export type AppDraftField = keyof ObservedAppDraft;

export type AppDraftErrors = Partial<Record<AppDraftField, string>>;

export type AppDraftValidation =
  { ok: true; draft: ObservedAppDraft } | { ok: false; errors: AppDraftErrors };

const HOST_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const URL_PATTERN = /^(https?:\/\/)[^\s]+$/i;
const MIN_VIEWPORT = 240;
const MAX_VIEWPORT = 8192;

const isBlank = (value: string): boolean => value.trim().length === 0;

const parseViewport = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.floor(value);
  if (rounded < MIN_VIEWPORT || rounded > MAX_VIEWPORT) return null;
  return rounded;
};

const isLikelyUrl = (value: string): boolean => {
  if (isBlank(value)) return false;
  if (!URL_PATTERN.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const validHostname = (value: string): boolean => isBlank(value) || HOST_PATTERN.test(value.trim());

export function validateAppDraft(input: ObservedAppDraft): AppDraftValidation {
  const errors: AppDraftErrors = {};

  if (isBlank(input.name)) {
    errors.name = 'Name is required.';
  } else if (input.name.trim().length > 80) {
    errors.name = 'Name must be 80 characters or fewer.';
  }

  if (isBlank(input.target_url)) {
    errors.target_url = 'Target URL is required.';
  } else if (!isLikelyUrl(input.target_url)) {
    errors.target_url = 'Target URL must start with http:// or https://.';
  }

  const cleanedHosts = input.allowed_hosts.map((host) => host.trim()).filter(Boolean);
  if (cleanedHosts.length === 0) {
    errors.allowed_hosts = 'Add at least one allowed host.';
  } else if (!cleanedHosts.every(validHostname)) {
    errors.allowed_hosts = 'Allowed hosts must be hostnames without scheme or path.';
  }

  const width = parseViewport(input.default_viewport_width);
  if (width === null) {
    errors.default_viewport_width = `Width must be between ${MIN_VIEWPORT} and ${MAX_VIEWPORT}.`;
  }

  const height = parseViewport(input.default_viewport_height);
  if (height === null) {
    errors.default_viewport_height = `Height must be between ${MIN_VIEWPORT} and ${MAX_VIEWPORT}.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    draft: {
      ...input,
      name: input.name.trim(),
      target_url: input.target_url.trim(),
      allowed_hosts: cleanedHosts,
      local_repo_path: input.local_repo_path.trim(),
      default_viewport_width: width ?? input.default_viewport_width,
      default_viewport_height: height ?? input.default_viewport_height,
    },
  };
}
