import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from 'react';
import {
  type ObservedApp,
  type ObservedAppDraft,
  emptyAppDraft,
  toAppDraft,
} from '@/domain/entities/ObservedApp';
import { type AppDraftErrors, type AppDraftField } from '@/domain/services/validateAppDraft';
import { Spinner } from '@/presentation/components/shared/Spinner';
import styles from './AppForm.module.css';

type AppFormProps = {
  editing: ObservedApp | null;
  fieldErrors: AppDraftErrors;
  submitError: string | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (draft: ObservedAppDraft) => void;
  onFieldChange: <K extends AppDraftField>(key: K, value: ObservedAppDraft[K]) => void;
};

const formatHosts = (hosts: string[]): string => hosts.join(', ');

const parseHosts = (value: string): string[] =>
  value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

const parseViewport = (raw: string, fallback: number): number => {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function AppForm({
  editing,
  fieldErrors,
  submitError,
  busy,
  onCancel,
  onSubmit,
  onFieldChange,
}: AppFormProps) {
  const [draft, setDraft] = useState<ObservedAppDraft>(() =>
    editing ? toAppDraft(editing) : emptyAppDraft(),
  );
  const formId = useId();

  useEffect(() => {
    setDraft(editing ? toAppDraft(editing) : emptyAppDraft());
  }, [editing]);

  const update = <K extends keyof ObservedAppDraft>(key: K, value: ObservedAppDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    onFieldChange(key, value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    onSubmit(draft);
  };

  const submitLabel = editing ? 'Save changes' : 'Create app';

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <p className={styles.intro}>
        {editing
          ? 'Update the details. The target URL stays locked to keep the observed window in sync.'
          : 'Register a target so the shared browser can open it. Fields marked required must be filled in.'}
      </p>

      <div className={styles.grid}>
        <Field label="Name" required error={fieldErrors.name} inputId={`${formId}-name`}>
          <input
            id={`${formId}-name`}
            type="text"
            value={draft.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => update('name', event.target.value)}
            maxLength={80}
            disabled={busy}
            placeholder="Sample app"
          />
        </Field>

        <Field
          label="Target URL"
          required
          error={fieldErrors.target_url}
          inputId={`${formId}-target-url`}
          hint="Cannot be changed after registration."
        >
          <input
            id={`${formId}-target-url`}
            type="url"
            value={draft.target_url}
            disabled={busy || Boolean(editing)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              update('target_url', event.target.value)
            }
            placeholder="http://host.docker.internal:3000"
          />
        </Field>

        <Field label="Run mode" inputId={`${formId}-run-mode`}>
          <select
            id={`${formId}-run-mode`}
            value={draft.run_mode}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              update('run_mode', event.target.value as ObservedAppDraft['run_mode'])
            }
          >
            <option value="host">host</option>
            <option value="container">container</option>
          </select>
        </Field>

        <Field
          label="Allowed hosts"
          required
          error={fieldErrors.allowed_hosts}
          inputId={`${formId}-hosts`}
          hint="Comma-separated hostnames."
        >
          <input
            id={`${formId}-hosts`}
            type="text"
            value={formatHosts(draft.allowed_hosts)}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              update('allowed_hosts', parseHosts(event.target.value))
            }
            placeholder="host.docker.internal, example.com"
          />
        </Field>

        <Field
          label="Viewport width"
          inputId={`${formId}-width`}
          error={fieldErrors.default_viewport_width}
        >
          <input
            id={`${formId}-width`}
            type="number"
            inputMode="numeric"
            min={240}
            max={8192}
            step={1}
            value={draft.default_viewport_width}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              update(
                'default_viewport_width',
                parseViewport(event.target.value, draft.default_viewport_width),
              )
            }
          />
        </Field>

        <Field
          label="Viewport height"
          inputId={`${formId}-height`}
          error={fieldErrors.default_viewport_height}
        >
          <input
            id={`${formId}-height`}
            type="number"
            inputMode="numeric"
            min={240}
            max={8192}
            step={1}
            value={draft.default_viewport_height}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              update(
                'default_viewport_height',
                parseViewport(event.target.value, draft.default_viewport_height),
              )
            }
          />
        </Field>

        <Field
          label="Local repo path"
          inputId={`${formId}-repo-path`}
          className={styles.fullWidth}
          hint="Optional. Used by mission workflows to clone or inspect source code."
        >
          <input
            id={`${formId}-repo-path`}
            type="text"
            value={draft.local_repo_path}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              update('local_repo_path', event.target.value)
            }
            placeholder="/absolute/path/to/repo"
          />
        </Field>

        <Field label="Description" inputId={`${formId}-description`} className={styles.fullWidth}>
          <textarea
            id={`${formId}-description`}
            value={draft.description}
            disabled={busy}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              update('description', event.target.value)
            }
            rows={2}
            placeholder="Short note that explains what this app is for."
          />
        </Field>
      </div>

      {submitError ? (
        <div className={styles.error} role="alert" aria-live="assertive">
          {submitError}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={styles.primaryButton} disabled={busy}>
          {busy ? (
            <span className={styles.submitContent}>
              <Spinner size={14} label="Saving" />
              <span>Saving…</span>
            </span>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  inputId: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactElement;
};

function Field({ label, inputId, required = false, error, hint, className, children }: FieldProps) {
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const child = Children.only(children);
  const enhanced = isValidElement(child)
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })
    : child;
  return (
    <label className={[styles.field, className].filter(Boolean).join(' ')} htmlFor={inputId}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? (
          <span aria-hidden="true" className={styles.required}>
            *
          </span>
        ) : null}
      </span>
      {enhanced}
      {hint ? (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={styles.fieldError} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
