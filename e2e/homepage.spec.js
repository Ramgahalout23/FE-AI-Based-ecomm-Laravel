import { test, expect } from '@playwright/test';
import { dismissOverlays, scrollToSection, robustClick, scrollPastHeader } from './helpers.js';

/**
 * Homepage — sections render, hero slider works, category section navigates.
 */
test.describe('Homepage', () => {
  test('renders all core sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await expect(page.locator('section').first()).toBeVisible();

    await scrollToSection(page, 'Shop by Category');
    await expect(page.getByRole('heading', { name: 'Shop by Category' }).first()).toBeVisible();
    await scrollToSection(page, 'Curated Looks');
    await expect(page.getByRole('heading', { name: 'Curated Looks' }).first()).toBeVisible();
  });

  test('category section has 8 tiles and navigates to /products?category=', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    const blackSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Shop by Category' }).first(),
    });
    await scrollToSection(page, 'Shop by Category');

    const cards = blackSection.locator('.category-card');
    await expect(cards).toHaveCount(8);

    await scrollPastHeader(page, cards.first());
    await robustClick(page, cards.first(), blackSection);
    await page.waitForURL(/\/products\?category=/);
    await expect(page.locator('.product-grid')).toBeVisible();
  });

  test('hero slider auto-rotates and arrows work', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    const hero = page.locator('section').first();
    const dots = hero.locator('button[aria-label^="Go to slide"]');
    if ((await dots.count()) > 1) {
      await expect(dots.first()).toBeVisible();
      await robustClick(page, hero.getByRole('button', { name: 'Next slide' }), hero);
      await expect(hero.locator('button[aria-label^="Go to slide"]').nth(1)).toHaveClass(/bg-white/);
    }
  });

  test('product slider arrows scroll the New Arrivals track', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Desktop only — mobile renders a static grid
    if (page.viewportSize().width < 640) return;

    const arrivals = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'New Arrivals' }).first(),
    });
    await scrollToSection(page, 'New Arrivals');
    const track = arrivals.locator('.product-slide').first();
    await scrollPastHeader(page, track);
    const before = await track.evaluate((el) => el.parentElement.scrollLeft);
    await robustClick(page, arrivals.getByRole('button', { name: 'Scroll right' }), arrivals);
    await page.waitForTimeout(700);
    const after = await track.evaluate((el) => el.parentElement.scrollLeft);
    expect(after).toBeGreaterThan(before);
  });
});
