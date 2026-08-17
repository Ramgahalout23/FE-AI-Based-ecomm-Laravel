import { test, expect } from '@playwright/test';
import { dismissOverlays, robustClick } from './helpers.js';

/**
 * Product listing + detail + section pages.
 */
test.describe('Product listing', () => {
  test('all-products page shows the grid', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await expect(page.locator('.product-grid')).toBeVisible();
    const cards = page.locator('.product-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('new-arrivals section page renders hero slider + products', async ({ page }) => {
    await page.goto('/products/section/new-arrivals');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await expect(page.getByRole('heading', { name: 'New Arrivals' }).first()).toBeVisible();
    await expect(page.locator('.product-grid')).toBeVisible();
    expect(await page.locator('.product-card').count()).toBeGreaterThan(0);
  });

  test('best-sellers section page renders', async ({ page }) => {
    await page.goto('/products/section/best-sellers');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await expect(page.getByRole('heading', { name: 'Best Sellers' }).first()).toBeVisible();
    await expect(page.locator('.product-grid')).toBeVisible();
    expect(await page.locator('.product-card').count()).toBeGreaterThan(0);
  });

  test('category filtered products page works', async ({ page }) => {
    await page.goto('/products?category=oversized-collection');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await expect(page.locator('.product-grid')).toBeVisible();
  });
});

test.describe('Product detail', () => {
  test('opens from a product card and shows add-to-cart', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    const firstCard = page.locator('.product-card').first();
    const name = (await firstCard.locator('.product-name, h3, .card-title').first().innerText()).trim();
    await robustClick(page, firstCard);
    await page.waitForURL(/\/products\/[^/]+$/);

    await expect(page.locator('body')).toContainText(name.slice(0, 20), { timeout: 15_000 });

    const addBtn = page.getByRole('button', { name: /add to cart|add to bag|add/i }).first();
    await expect(addBtn).toBeVisible();
  });
});
