import { createAsyncThunk, createSlice, isRejected, type PayloadAction } from '@reduxjs/toolkit';
import {
  deleteAppUseCase,
  listAppsUseCase,
  openAppUseCase,
  submitAppUseCase,
} from '@/application/use-cases/appsUseCases';
import { listRunsUseCase } from '@/application/use-cases/runsUseCases';
import {
  loadOverviewUseCase,
  stopSessionUseCase,
  updateSettingsUseCase,
} from '@/application/use-cases/systemUseCases';
import type { MissionRun } from '@/domain/entities/MissionRun';
import type { ObservedApp, ObservedAppDraft } from '@/domain/entities/ObservedApp';
import type { ObserverSession, OpenAppResult } from '@/domain/entities/ObserverSession';
import type { HealthReport, ObserverStatus, RavenEyeSettings } from '@/domain/entities/SystemStatus';
import { dependencies } from './dependencies';

interface DashboardState {
  health: HealthReport | null;
  status: ObserverStatus | null;
  settings: RavenEyeSettings | null;
  apps: ObservedApp[];
  sessions: ObserverSession[];
  runs: MissionRun[];
  loading: boolean;
  error: string | null;
  notice: string | null;
}

const initialState: DashboardState = {
  health: null,
  status: null,
  settings: null,
  apps: [],
  sessions: [],
  runs: [],
  loading: false,
  error: null,
  notice: null,
};

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export const loadDashboard = createAsyncThunk('dashboard/loadDashboard', async () => {
  const [overview, apps, runs] = await Promise.all([
    loadOverviewUseCase(dependencies.systemRepository),
    listAppsUseCase(dependencies.appRepository),
    listRunsUseCase(dependencies.runRepository),
  ]);
  return { ...overview, apps, runs };
});

export const saveApp = createAsyncThunk(
  'dashboard/saveApp',
  async ({ id, draft }: { id?: string; draft: ObservedAppDraft }) =>
    submitAppUseCase(dependencies.appRepository, { id, draft }),
);

export const removeApp = createAsyncThunk('dashboard/removeApp', async (id: string) => {
  await deleteAppUseCase(dependencies.appRepository, id);
  return id;
});

export const openApp = createAsyncThunk('dashboard/openApp', async (id: string) =>
  openAppUseCase(dependencies.appRepository, id),
);

export const stopSession = createAsyncThunk('dashboard/stopSession', async (id: string) =>
  stopSessionUseCase(dependencies.systemRepository, id),
);

export const saveSettings = createAsyncThunk(
  'dashboard/saveSettings',
  async (settings: Partial<RavenEyeSettings>) =>
    updateSettingsUseCase(dependencies.systemRepository, settings),
);

const slice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearMessage(state) {
      state.error = null;
      state.notice = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.health = action.payload.health;
        state.status = action.payload.status;
        state.settings = action.payload.settings;
        state.apps = action.payload.apps;
        state.sessions = action.payload.status.sessions ?? [];
        state.runs = action.payload.runs;
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = errorMessage(action.error.message);
      })
      .addCase(saveApp.fulfilled, (state, action: PayloadAction<ObservedApp>) => {
        const index = state.apps.findIndex((app) => app.id === action.payload.id);
        if (index >= 0) state.apps[index] = action.payload;
        else state.apps.unshift(action.payload);
        state.notice = `Saved ${action.payload.name}`;
      })
      .addCase(removeApp.fulfilled, (state, action: PayloadAction<string>) => {
        state.apps = state.apps.filter((app) => app.id !== action.payload);
        state.notice = 'App deleted';
      })
      .addCase(openApp.fulfilled, (state, action: PayloadAction<OpenAppResult>) => {
        const session = action.payload.session;
        const existing = state.sessions.findIndex((item) => item.id === session.id);
        if (existing >= 0) state.sessions[existing] = session;
        else state.sessions.unshift(session);
        const app = state.apps.find((item) => item.id === session.appId);
        if (app) {
          const appSessions = app.sessions ?? [];
          const appExisting = appSessions.findIndex((item) => item.id === session.id);
          app.sessions =
            appExisting >= 0
              ? appSessions.map((item) => (item.id === session.id ? session : item))
              : [session, ...appSessions];
        }
        state.notice = `${action.payload.detail}: ${action.payload.watchUrl}`;
      })
      .addCase(stopSession.fulfilled, (state, action: PayloadAction<ObserverSession>) => {
        state.sessions = state.sessions.filter((session) => session.id !== action.payload.id);
        state.apps = state.apps.map((app) => ({
          ...app,
          sessions: app.sessions?.filter((session) => session.id !== action.payload.id),
        }));
        state.notice = `Stopped session ${action.payload.id}`;
      })
      .addCase(saveSettings.fulfilled, (state, action: PayloadAction<RavenEyeSettings>) => {
        state.settings = action.payload;
        state.notice = 'Settings saved';
      })
      .addMatcher(isRejected, (state, action) => {
        state.error = errorMessage(action.error.message);
      });
  },
});

export const { clearMessage } = slice.actions;
export const dashboardReducer = slice.reducer;
