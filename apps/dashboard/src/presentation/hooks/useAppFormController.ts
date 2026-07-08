import { useCallback, useState } from 'react';
import {
  type ObservedApp,
  type ObservedAppDraft,
  emptyAppDraft,
  toAppDraft,
} from '@/domain/entities/ObservedApp';
import {
  type AppDraftErrors,
  type AppDraftField,
  validateAppDraft,
} from '@/domain/services/validateAppDraft';
import { loadDashboard, saveApp } from '@/presentation/store/dashboardSlice';
import { useAppDispatch } from '@/presentation/store/store';

export type AppFormMode = 'closed' | 'create' | { kind: 'edit'; app: ObservedApp };

export type AppFormState = {
  mode: AppFormMode;
  draft: ObservedAppDraft;
  fieldErrors: AppDraftErrors;
  submitError: string | null;
  busy: boolean;
};

const initialState = (): AppFormState => ({
  mode: 'closed',
  draft: emptyAppDraft(),
  fieldErrors: {},
  submitError: null,
  busy: false,
});

const withoutField = (errors: AppDraftErrors, key: AppDraftField): AppDraftErrors => {
  if (!errors[key]) return errors;
  const next: AppDraftErrors = {};
  for (const k of Object.keys(errors) as AppDraftField[]) {
    if (k !== key) next[k] = errors[k];
  }
  return next;
};

export type AppFormController = AppFormState & {
  isOpen: boolean;
  isEditing: boolean;
  editingApp: ObservedApp | null;
  openCreate: () => void;
  openEdit: (app: ObservedApp) => void;
  close: () => void;
  setField: <K extends AppDraftField>(key: K, value: ObservedAppDraft[K]) => void;
  submit: () => Promise<void>;
};

export function useAppFormController(): AppFormController {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<AppFormState>(initialState);

  const openCreate = useCallback(() => {
    setState({
      mode: 'create',
      draft: emptyAppDraft(),
      fieldErrors: {},
      submitError: null,
      busy: false,
    });
  }, []);

  const openEdit = useCallback((app: ObservedApp) => {
    setState({
      mode: { kind: 'edit', app },
      draft: toAppDraft(app),
      fieldErrors: {},
      submitError: null,
      busy: false,
    });
  }, []);

  const close = useCallback(() => {
    setState(initialState());
  }, []);

  const setField = useCallback(<K extends AppDraftField>(key: K, value: ObservedAppDraft[K]) => {
    setState((current) => ({
      ...current,
      draft: { ...current.draft, [key]: value },
      fieldErrors: withoutField(current.fieldErrors, key),
    }));
  }, []);

  const submit = useCallback(async () => {
    const validation = validateAppDraft(state.draft);
    if (!validation.ok) {
      setState((current) => ({ ...current, fieldErrors: validation.errors, submitError: null }));
      return;
    }

    const id = state.mode !== 'create' && state.mode !== 'closed' ? state.mode.app.id : undefined;

    setState((current) => ({
      ...current,
      busy: true,
      submitError: null,
      draft: validation.draft,
    }));

    const action = await dispatch(saveApp({ id, draft: validation.draft }));
    if (saveApp.fulfilled.match(action)) {
      setState(initialState());
      void dispatch(loadDashboard());
      return;
    }
    setState((current) => ({
      ...current,
      busy: false,
      submitError:
        (action.error && 'message' in action.error && typeof action.error.message === 'string'
          ? action.error.message
          : null) ?? 'Could not save the app. Please try again.',
    }));
  }, [dispatch, state.draft, state.mode]);

  const editingApp = state.mode !== 'create' && state.mode !== 'closed' ? state.mode.app : null;

  return {
    ...state,
    isOpen: state.mode !== 'closed',
    isEditing: editingApp !== null,
    editingApp,
    openCreate,
    openEdit,
    close,
    setField,
    submit,
  };
}
