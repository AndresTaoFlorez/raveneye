import type { Page } from 'playwright';
import type {
  OverflowInspection,
  A11yInspection,
  ControlsInspection,
  KeyboardInspection,
} from './types.js';

export async function inspectHorizontalOverflow(page: Page): Promise<OverflowInspection> {
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;
    const scrollWidth = Math.max(doc.scrollWidth, document.body?.scrollWidth ?? 0);
    const offenders: { element: string; right: number; width: number }[] = [];
    if (scrollWidth > clientWidth + 1) {
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.right > clientWidth + 1 && offenders.length < 10) {
          const id = el.id ? `#${el.id}` : '';
          const cls =
            typeof el.className === 'string' && el.className
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
              : '';
          offenders.push({
            element: `${el.tagName.toLowerCase()}${id}${cls}`,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      }
    }
    return { scrollWidth, clientWidth, offenders };
  });
  return {
    kind: 'horizontal-overflow',
    page_url: page.url(),
    ts: new Date().toISOString(),
    has_overflow: data.scrollWidth > data.clientWidth + 1,
    scroll_width: data.scrollWidth,
    client_width: data.clientWidth,
    offenders: data.offenders,
  };
}

export async function inspectAccessibility(page: Page, name: string): Promise<A11yInspection> {
  const ariaSnapshot = await page.locator('body').ariaSnapshot();
  const issues = await page.evaluate(() => {
    const problems: { type: string; element: string; detail: string }[] = [];
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : '';
      const nameAttr = el.getAttribute('name');
      return `${el.tagName.toLowerCase()}${id}${nameAttr ? `[name=${nameAttr}]` : ''}`;
    };

    for (const el of Array.from(document.querySelectorAll('input, select, textarea'))) {
      const input = el as HTMLInputElement;
      if (input.type === 'hidden') continue;
      const hasLabel =
        (input.labels && input.labels.length > 0) ||
        input.getAttribute('aria-label') ||
        input.getAttribute('aria-labelledby') ||
        input.getAttribute('title');
      if (!hasLabel) {
        problems.push({
          type: 'missing-label',
          element: describe(el),
          detail: 'form control has no associated label or aria-label',
        });
      }
    }

    for (const el of Array.from(document.querySelectorAll('button, a[href]'))) {
      const text = (el.textContent ?? '').trim();
      const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      if (!text && !aria && !el.querySelector('img[alt]')) {
        problems.push({
          type: 'missing-accessible-name',
          element: describe(el),
          detail: 'interactive element has no accessible name',
        });
      }
    }

    for (const el of Array.from(document.querySelectorAll('img'))) {
      if (!el.hasAttribute('alt')) {
        problems.push({
          type: 'missing-alt',
          element: describe(el),
          detail: 'image has no alt attribute',
        });
      }
    }
    return problems;
  });

  return {
    kind: 'accessibility',
    name,
    page_url: page.url(),
    ts: new Date().toISOString(),
    aria_snapshot: ariaSnapshot,
    issues,
  };
}

export async function inspectInteractiveControls(page: Page): Promise<ControlsInspection> {
  const data = await page.evaluate(() => {
    const controls = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, [role="button"]'),
    );
    const problematic: { element: string; reason: string }[] = [];
    const doc = document.documentElement;
    const describe = (el: Element) => {
      const id = el.id ? `#${el.id}` : '';
      const text = (el.textContent ?? '').trim().slice(0, 30);
      return `${el.tagName.toLowerCase()}${id}${text ? ` "${text}"` : ''}`;
    };
    for (const el of controls) {
      const input = el as HTMLElement;
      if (input instanceof HTMLInputElement && input.type === 'hidden') continue;
      const rect = input.getBoundingClientRect();
      const style = getComputedStyle(input);
      if (style.display === 'none' || style.visibility === 'hidden') continue; // legitimately hidden
      if (rect.width === 0 || rect.height === 0) {
        problematic.push({ element: describe(el), reason: 'zero-size but not display:none' });
      } else if (rect.right < 0 || rect.left > doc.clientWidth) {
        problematic.push({ element: describe(el), reason: 'outside horizontal viewport' });
      } else if (rect.width < 24 && rect.height < 24 && input.tagName !== 'A') {
        problematic.push({
          element: describe(el),
          reason: `very small hit target (${Math.round(rect.width)}x${Math.round(rect.height)}px)`,
        });
      }
    }
    return { total: controls.length, problematic };
  });
  return {
    kind: 'interactive-controls',
    page_url: page.url(),
    ts: new Date().toISOString(),
    total: data.total,
    problematic: data.problematic,
  };
}

export async function inspectKeyboardNavigation(page: Page): Promise<KeyboardInspection> {
  await page
    .locator('body')
    .focus()
    .catch(() => {});
  const sequence: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const desc = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const id = el.id ? `#${el.id}` : '';
      const text = (el.textContent ?? '').trim().slice(0, 25);
      return `${el.tagName.toLowerCase()}${id}${text ? ` "${text}"` : ''}`;
    });
    if (!desc) continue;
    sequence.push(desc);
    if (seen.has(desc)) break; // wrapped around
    seen.add(desc);
  }
  return {
    kind: 'keyboard-navigation',
    page_url: page.url(),
    ts: new Date().toISOString(),
    distinct_stops: seen.size,
    sequence,
  };
}
