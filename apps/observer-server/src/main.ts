import { mergeAllowedHosts } from '@raveneye/shared';
import { loadConfig } from './config.js';
import { SessionManager, SessionStore } from './sessions.js';
import { startApi } from './api.js';
import { EvidenceCollector } from './evidence.js';
import { AppRegistry } from './apps.js';
import { evaluateTargetUrl } from '@raveneye/shared';
import { SettingsStore } from './settings.js';

const cfg = loadConfig();
const registry = new AppRegistry(cfg.databasePath);
const sessionStore = new SessionStore(cfg.databasePath);
const settings = new SettingsStore(cfg.databasePath, { max_dynamic_sessions: cfg.maxSessions });
registry.ensureSeedApp({
  id: 'sample-app',
  name: 'Sample App',
  description: 'Bundled RavenEye validation target.',
  target_url: 'http://sample-app:3000',
  allowed_hosts: ['sample-app'],
  run_mode: 'container',
  default_viewport_width: 1440,
  default_viewport_height: 900,
});

function configuredTargetSeed(): ReturnType<typeof registry.get> {
  const target = new URL(cfg.targetUrl);
  if (target.href === 'http://sample-app:3000/') return null;
  return registry.ensureSeedApp({
    id: 'configured-target',
    name: 'Configured Target',
    description: 'Target declared through RAVENEYE_TARGET_URL.',
    target_url: target.toString(),
    allowed_hosts: mergeAllowedHosts([target.hostname], cfg.allowedHosts),
    run_mode: target.hostname === 'host.docker.internal' ? 'host' : 'container',
    default_viewport_width: cfg.viewportWidth,
    default_viewport_height: cfg.viewportHeight,
  });
}

async function main() {
  console.log(`[observer] starting; profile=${cfg.profileMode} headless=${cfg.headless}`);

  const sessions = new SessionManager(cfg, sessionStore, () => settings.getMaxDynamicSessions());

  const initialApp = configuredTargetSeed() ?? registry.get('sample-app');
  const initialUrl = initialApp?.target_url ?? cfg.targetUrl;
  const initialHosts = initialApp
    ? mergeAllowedHosts([new URL(initialApp.target_url).hostname], initialApp.allowed_hosts)
    : cfg.allowedHosts;

  const collector = new EvidenceCollector();
  let baseSessionId = '';
  try {
    const baseSession = await sessions.startBase({
      appId: initialApp?.id ?? 'shared',
      targetUrl: initialUrl,
      allowedHosts: initialHosts,
      viewportWidth: initialApp?.default_viewport_width ?? cfg.viewportWidth,
      viewportHeight: initialApp?.default_viewport_height ?? cfg.viewportHeight,
    });
    baseSessionId = baseSession.id;
    console.log(`[observer] base session up: ${baseSession.novncUrl}`);
    const baseContext = sessions.contextOf(baseSession.id);
    if (baseContext) collector.attach(baseContext);
  } catch (err) {
    console.error(`[observer] base session failed to start: ${(err as Error).message}`);
    console.error('[observer] API will run without a base session; dynamic sessions may still be created');
  }

  startApi({ cfg, registry, sessions, collector, baseSessionId, settings });

  // Best-effort target validation: log a warning if the policy rejects the
  // initial URL, but never fail startup over it (the user can correct it).
  const decision = evaluateTargetUrl(initialUrl, { allowedHosts: initialHosts });
  if (!decision.allowed) {
    console.warn(`[observer] initial target rejected by URL policy: ${decision.reason}`);
  }

  const shutdown = async (signal: string) => {
    console.log(`[observer] ${signal} received; shutting down`);
    try {
      await sessions.stopAll();
      registry.close();
      sessionStore.close();
      settings.close();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[observer] fatal:', err);
  process.exit(1);
});
