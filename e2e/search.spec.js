import { test, expect } from '@playwright/test';
import { dismissOverlays, robustClick } from './helpers.js';

/**
 * Search modal flow.
 */
test.describe('Search', () => {
  test('search modal opens and returns results', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Visible search button in the header (mobile: aria-label, desktop: icon-only)
    const searchBtn = page.locator('header button:visible').filter({
      has: page.locator('svg.lucide-search'),
    }).first();
    await robustClick(page, searchBtn);

    const input = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    await expect(input).toBeVisible();
    await input.fill('tee');
    await page.waitForTimeout(1200);

    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toContain('tee');
  });
});
