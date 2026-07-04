import type { Locator, Page } from 'playwright';
import { evaluateTargetUrl, type UrlPolicy } from '@raveneye/shared';
import type { MissionStep } from './schema.js';
import type { Inspection } from './types.js';
import {
  inspectHorizontalOverflow,
  inspectAccessibility,
} from './inspections.js';

export interface StepContext {
  page: Page;
  baseUrl: URL;
  policy: UrlPolicy;
  screenshotsDir: string;
  inspections: Inspection[];
  screenshots: string[];
  markers: { ts: string; note: string }[];
  setViewport: (w: number, h: number) => Promise<void>;
}

interface LocatorSpec {
  selector?: string;
  role?: string;
  name?: string;
  text?: string;
  label?: string;
}

function resolveLocator(page: Page, spec: LocatorSpec): Locator {
  if (spec.selector) return page.locator(spec.selector).first();
  if (spec.role) {
    // Playwright validates the role at call time.
    return page
      .getByRole(spec.role as Parameters<Page['getByRole']>[0], {
        name: spec.name,
      })
      .first();
  }
  if (spec.label) return page.getByLabel(spec.label).first();
  if (spec.text) return page.getByText(spec.text).first();
  throw new Error('unresolvable locator (validated schema should prevent this)');
}

function resolveTarget(ctx: StepContext, step: { path?: string; url?: string }): string {
  const raw = step.url ?? new URL(step.path ?? '/', ctx.baseUrl).toString();
  const decision = evaluateTargetUrl(raw, ctx.policy);
  if (!decision.allowed) throw new Error(`url policy: ${decision.reason}`);
  return decision.url.toString();
}

/** Executes one validated mission step. Throws on failure. */
export async function executeStep(ctx: StepContext, step: MissionStep): Promise<string> {
  const { page } = ctx;
  switch (step.action) {
    case 'goto':
    case 'navigate': {
      const url = resolveTarget(ctx, step);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return `at ${page.url()}`;
    }
    case 'reload':
      await page.reload({ waitUntil: 'domcontentloaded' });
      return `reloaded ${page.url()}`;
    case 'back':
      await page.goBack({ waitUntil: 'domcontentloaded' });
      return `back to ${page.url()}`;
    case 'forward':
      await page.goForward({ waitUntil: 'domcontentloaded' });
      return `forward to ${page.url()}`;
    case 'click':
      await resolveLocator(page, step).click();
      return 'clicked';
    case 'fill':
      await resolveLocator(page, step).fill(step.value);
      return 'filled';
    case 'type':
      await resolveLocator(page, step).pressSequentially(step.value, {
        delay: step.delay_ms ?? 0,
      });
      return 'typed';
    case 'press':
      if (step.selector) await page.locator(step.selector).first().press(step.key);
      else await page.keyboard.press(step.key);
      return `pressed ${step.key}`;
    case 'select':
      await resolveLocator(page, step).selectOption(step.value);
      return `selected ${step.value}`;
    case 'check':
      await resolveLocator(page, step).check();
      return 'checked';
    case 'uncheck':
      await resolveLocator(page, step).uncheck();
      return 'unchecked';
    case 'hover':
      await resolveLocator(page, step).hover();
      return 'hovered';
    case 'scroll': {
      if (step.to === 'bottom') {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      } else if (step.to === 'top') {
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        await page.evaluate((y) => window.scrollBy(0, y ?? 0), step.y);
      }
      return 'scrolled';
    }
    case 'wait':
      await page.waitForTimeout(step.ms);
      return `waited ${step.ms}ms`;
    case 'wait_for_ready': {
      const timeout = step.timeout_ms ?? 15_000;
      await page.waitForLoadState('load', { timeout });
      await page.waitForLoadState('networkidle', { timeout }).catch(() => {
        // Long-polling apps never reach networkidle; load is the hard requirement.
      });
      return 'ready';
    }
    case 'wait_for_selector':
      await page.waitForSelector(step.selector, {
        state: step.state ?? 'visible',
        timeout: step.timeout_ms ?? 15_000,
      });
      return `selector ${step.selector} ${step.state ?? 'visible'}`;
    case 'screenshot': {
      const file = `${ctx.screenshotsDir}/${step.name}.png`;
      await page.screenshot({ path: file, fullPage: step.full_page ?? false });
      ctx.screenshots.push(file);
      return file;
    }
    case 'inspect_accessibility': {
      const insp = await inspectAccessibility(page, step.name ?? `a11y-${ctx.inspections.length}`);
      ctx.inspections.push(insp);
      return `${insp.issues.length} issue(s)`;
    }
    case 'capture_console':
      ctx.markers.push({ ts: new Date().toISOString(), note: 'capture_console marker' });
      return 'console capture marked (collected continuously)';
    case 'capture_network':
      ctx.markers.push({ ts: new Date().toISOString(), note: 'capture_network marker' });
      return 'network capture marked (collected continuously)';
    case 'check_horizontal_overflow': {
      const insp = await inspectHorizontalOverflow(page);
      ctx.inspections.push(insp);
      return insp.has_overflow
        ? `OVERFLOW: scroll ${insp.scroll_width}px > client ${insp.client_width}px`
        : 'no horizontal overflow';
    }
    case 'set_viewport':
      await ctx.setViewport(step.width, step.height);
      return `viewport ${step.width}x${step.height}`;
  }
}
