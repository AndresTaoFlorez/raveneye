import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const API = process.env['RAVENEYE_API'] ?? 'http://127.0.0.1:8090';
const CDP = process.env['RAVENEYE_CDP'] ?? 'http://127.0.0.1:9222';
const ARTIFACTS = process.env['RAVENEYE_ARTIFACTS'] ?? resolve('artifacts');

async function api(path: string, opts?: RequestInit): Promise<unknown> {
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
}

async function apiPost(path: string, body?: unknown): Promise<unknown> {
  return api(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Maps the Docker-internal artifact path to the host-mounted path.
function hostPath(dockerPath: string): string {
  // /artifacts/screenshots/foo.png → <ARTIFACTS>/screenshots/foo.png
  const relative = dockerPath.replace(/^\/artifacts\//, '');
  return join(ARTIFACTS, relative);
}

async function screenshotImageContent(name: string, fullPage: boolean) {
  const result = (await apiPost('/screenshot', { name, full_page: fullPage })) as {
    ok: boolean;
    path?: string;
    detail?: string;
  };
  if (!result.ok || !result.path) {
    return { text: `Screenshot failed: ${result.detail ?? 'unknown error'}` };
  }
  const absPath = hostPath(result.path);
  const data = await readFile(absPath);
  return {
    image: data.toString('base64'),
    mimeType: 'image/png',
    path: result.path,
  };
}

const TOOLS: Tool[] = [
  {
    name: 'raveneye_health',
    description: 'Check whether the Raveneye stack is healthy. Returns status and component details.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'raveneye_status',
    description: 'Get current observer status: target URL, active sessions, allowed hosts, viewport.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'raveneye_navigate',
    description: 'Navigate the shared browser to a URL. The URL must be in the allowed-hosts list.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Absolute URL to navigate to' } },
      required: ['url'],
    },
  },
  {
    name: 'raveneye_screenshot',
    description: 'Take a screenshot of the current browser page and return it as an inline image.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'File name prefix (default: screenshot)' },
        full_page: { type: 'boolean', description: 'Capture the full scrollable page (default: false)' },
      },
      required: [],
    },
  },
  {
    name: 'raveneye_observe',
    description:
      'Combined observation: takes a screenshot and returns it together with the current console log and network events. The single best tool to understand the current state of the browser.',
    inputSchema: {
      type: 'object',
      properties: {
        clear: { type: 'boolean', description: 'Clear log buffers after reading (default: false)' },
        problems_only: { type: 'boolean', description: 'Limit network entries to failures/4xx/5xx (default: false)' },
      },
      required: [],
    },
  },
  {
    name: 'raveneye_console',
    description: 'Read captured browser console output (up to 2000 entries).',
    inputSchema: {
      type: 'object',
      properties: {
        clear: { type: 'boolean', description: 'Clear the buffer after reading' },
      },
      required: [],
    },
  },
  {
    name: 'raveneye_network',
    description: 'Read captured network events. Use problems_only to filter to failures/4xx/5xx.',
    inputSchema: {
      type: 'object',
      properties: {
        problems_only: { type: 'boolean', description: 'Only return failed/error requests' },
        clear: { type: 'boolean', description: 'Clear the buffer after reading' },
      },
      required: [],
    },
  },
  {
    name: 'raveneye_click',
    description: 'Click a DOM element in the shared browser using a CSS selector or role locator.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or Playwright locator string' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'raveneye_fill',
    description: 'Fill a text input or textarea in the shared browser.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the input element' },
        text: { type: 'string', description: 'Text to type into the input' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'raveneye_apps_list',
    description: 'List all registered observed apps in the app registry.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'raveneye_app_open',
    description:
      'Open a dynamic isolated browser session for a registered app. Returns the session CDP URL and watch URL.',
    inputSchema: {
      type: 'object',
      properties: {
        app_id: { type: 'string', description: 'App ID from raveneye_apps_list' },
      },
      required: ['app_id'],
    },
  },
];

async function withCdpPage<T>(fn: (page: import('playwright').Page) => Promise<T>): Promise<T> {
  const browser = await chromium.connectOverCDP(CDP);
  try {
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error('No browser context available — is the Raveneye stack running?');
    const page = ctx.pages()[0];
    if (!page) throw new Error('No open page found in the shared browser context');
    return await fn(page);
  } finally {
    await browser.close(); // detach only — does not kill Chromium
  }
}

const server = new Server(
  { name: 'raveneye', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = (args ?? {}) as Record<string, unknown>;

  try {
    switch (name) {
      case 'raveneye_health': {
        const data = await api('/health');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_status': {
        const data = await api('/status');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_navigate': {
        const data = await apiPost('/navigate', { url: a['url'] });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_screenshot': {
        const result = await screenshotImageContent(
          typeof a['name'] === 'string' ? a['name'] : 'screenshot',
          a['full_page'] === true,
        );
        if ('image' in result) {
          return {
            content: [
              { type: 'image', data: result.image, mimeType: result.mimeType },
              { type: 'text', text: `Saved to: ${result.path}` },
            ],
          };
        }
        return { content: [{ type: 'text', text: result.text }] };
      }

      case 'raveneye_observe': {
        const clear = a['clear'] === true ? '?clear=1' : '';
        const netClear = a['clear'] === true ? '&clear=1' : '';
        const problems = a['problems_only'] === true ? '?problems=1' : '?problems=0';

        const [consoleData, networkData, shot] = await Promise.all([
          api(`/console${clear}`),
          api(`/network${problems}${netClear}`),
          screenshotImageContent('observe', false),
        ]);

        const content: Array<{ type: string; [k: string]: unknown }> = [
          { type: 'text', text: `### Console\n\`\`\`json\n${JSON.stringify(consoleData, null, 2)}\n\`\`\`` },
          { type: 'text', text: `### Network\n\`\`\`json\n${JSON.stringify(networkData, null, 2)}\n\`\`\`` },
        ];
        if ('image' in shot) {
          content.push({ type: 'image', data: shot.image, mimeType: shot.mimeType });
          content.push({ type: 'text', text: `Screenshot saved to: ${shot.path}` });
        } else {
          content.push({ type: 'text', text: shot.text });
        }
        return { content };
      }

      case 'raveneye_console': {
        const qs = a['clear'] === true ? '?clear=1' : '';
        const data = await api(`/console${qs}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_network': {
        const params = new URLSearchParams();
        if (a['problems_only'] === true) params.set('problems', '1');
        if (a['clear'] === true) params.set('clear', '1');
        const qs = params.size > 0 ? `?${params.toString()}` : '';
        const data = await api(`/network${qs}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_click': {
        await withCdpPage((page) => page.click(String(a['selector'])));
        return { content: [{ type: 'text', text: `Clicked: ${a['selector']}` }] };
      }

      case 'raveneye_fill': {
        await withCdpPage((page) => page.fill(String(a['selector']), String(a['text'])));
        return { content: [{ type: 'text', text: `Filled "${a['selector']}" with text` }] };
      }

      case 'raveneye_apps_list': {
        const data = await api('/api/apps');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      case 'raveneye_app_open': {
        const data = await apiPost(`/api/apps/${String(a['app_id'])}/open`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
