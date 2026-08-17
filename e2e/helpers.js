import { expect } from '@playwright/test';

/**
 * Dismiss any full-screen modal/overlay that could intercept clicks
 * (e.g. PWA install prompt, sales popup, offer modal).
 */
export async function dismissOverlays(page) {
  await page.waitForTimeout(800);
  const overlays = page.locator(
    '.fixed.inset-0, [class*="modal"], [class*="Modal"], [role="dialog"], .fixed.z-50'
  );
  const count = await overlays.count();
  for (let i = 0; i < count; i++) {
    const overlay = overlays.nth(i);
    if (!(await overlay.isVisible())) continue;
    // Cookie/consent modals — click Accept or Reject
    const acceptBtn = overlay.getByRole('button', { name: /accept|reject|allow|agree|ok/i }).first();
    if (await acceptBtn.isVisible()) {
      try {
        await acceptBtn.click({ timeout: 2500 });
        await page.waitForTimeout(500);
        continue;
      } catch { /* fall through */ }
    }
    // Try close button next
    const closeBtn = overlay.getByRole('button').filter({ has: page.locator('svg') }).first();
    if (await closeBtn.isVisible()) {
      try {
        await closeBtn.click({ timeout: 2000 });
        await page.waitForTimeout(400);
        continue;
      } catch { /* not a closeable modal */ }
    }
    // Escape fallback
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
}

/**
 * Find a section by its heading text and scroll it into view,
 * waiting for lazy content to load. Returns the section locator.
 */
export async function scrollToSection(page, headingText) {
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: headingText }).first() })
    .first();
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  return section;
}

/**
 * Pause carousel autoplay by hovering the section (components pause on hover).
 */
export async function pauseAutoplay(page, section) {
  await section.hover({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Click a locator robustly: dismiss overlays, hover to pause autoplay,
 * scroll into view, click with force fallback.
 */
export async function robustClick(page, locator, section) {
  await dismissOverlays(page);
  if (section) await pauseAutoplay(page, section);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  try {
    await locator.click({ timeout: 6000 });
  } catch {
    await locator.click({ force: true, timeout: 6000 });
  }
}

/**
 * Scroll the window so the sticky header does not cover the target.
 */
export async function scrollPastHeader(page, element) {
  await element.evaluate((el) => {
    const header = document.querySelector('header');
    const headerH = header ? header.offsetHeight : 0;
    const rect = el.getBoundingClientRect();
    window.scrollBy(0, rect.top - headerH - 80);
  });
  await page.waitForTimeout(400);
}
