import { z } from 'zod';

/**
 * Declarative mission format. Small on purpose: typed steps and named
 * checks, not a programming language.
 */

const locatorShape = {
  selector: z.string().optional(),
  role: z.string().optional(),
  name: z.string().optional(),
  text: z.string().optional(),
  label: z.string().optional(),
};

const locatorRefine = (v: Record<string, unknown>) =>
  Boolean(v.selector || v.role || v.text || v.label);
const LOCATOR_MSG = 'a locator needs one of: selector, role(+name), text, label';

function step<A extends string, S extends z.ZodRawShape>(action: A, shape: S) {
  return z.object({ action: z.literal(action), ...shape }).strict();
}

function locatorStep<A extends string, S extends z.ZodRawShape>(action: A, shape: S) {
  return z
    .object({ action: z.literal(action), ...locatorShape, ...shape })
    .strict()
    .refine(locatorRefine, LOCATOR_MSG);
}

export const stepSchema = z.discriminatedUnion('action', [
  step('goto', { path: z.string().optional(), url: z.string().optional() }),
  step('navigate', { path: z.string().optional(), url: z.string().optional() }),
  step('reload', {}),
  step('back', {}),
  step('forward', {}),
  locatorStep('click', {}),
  locatorStep('fill', { value: z.string() }),
  locatorStep('type', { value: z.string(), delay_ms: z.number().int().min(0).optional() }),
  step('press', { key: z.string(), selector: z.string().optional() }),
  locatorStep('select', { value: z.string() }),
  locatorStep('check', {}),
  locatorStep('uncheck', {}),
  locatorStep('hover', {}),
  step('scroll', {
    to: z.enum(['top', 'bottom']).optional(),
    y: z.number().optional(),
  }),
  step('wait', { ms: z.number().int().min(0).max(60_000) }),
  step('wait_for_ready', { timeout_ms: z.number().int().positive().optional() }),
  step('wait_for_selector', {
    selector: z.string(),
    state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
    timeout_ms: z.number().int().positive().optional(),
  }),
  step('screenshot', { name: z.string(), full_page: z.boolean().optional() }),
  step('inspect_accessibility', { name: z.string().optional() }),
  step('capture_console', {}),
  step('capture_network', {}),
  step('check_horizontal_overflow', {}),
  step('set_viewport', { width: z.number().int().positive(), height: z.number().int().positive() }),
]);

export const CHECK_NAMES = [
  'no_unhandled_page_errors',
  'no_critical_console_errors',
  'no_unexpected_failed_requests',
  'no_horizontal_overflow',
  'interactive_controls_visible',
  'keyboard_navigation_available',
] as const;

const checkName = z.enum(CHECK_NAMES);

/** Checks may carry allow-patterns (substring match) for expected noise. */
export const checkSchema = z.union([
  checkName,
  z.object({ name: checkName, allow: z.array(z.string()).default([]) }).strict(),
]);

export const missionSchema = z
  .object({
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'kebab-case name required'),
    description: z.string().default(''),
    target_url: z.string().optional(),
    viewport: z
      .object({ width: z.number().int().positive(), height: z.number().int().positive() })
      .default({ width: 1440, height: 900 }),
    steps: z.array(stepSchema).min(1),
    checks: z.array(checkSchema).default([]),
  })
  .strict();

export type Mission = z.infer<typeof missionSchema>;
export type MissionStep = z.infer<typeof stepSchema>;
export type MissionCheck = z.infer<typeof checkSchema>;

export interface NormalizedCheck {
  name: (typeof CHECK_NAMES)[number];
  allow: string[];
}

export function normalizeChecks(checks: MissionCheck[]): NormalizedCheck[] {
  return checks.map((c) => (typeof c === 'string' ? { name: c, allow: [] } : c));
}
