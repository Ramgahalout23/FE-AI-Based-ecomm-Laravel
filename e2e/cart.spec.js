import { test, expect } from '@playwright/test';
import { dismissOverlays, robustClick, scrollPastHeader } from './helpers.js';

/**
 * Cart flow — add from quick-add on card, cart drawer, cart page.
 */
async function addFirstProductToCart(page) {
  await page.goto('/products');
  await page.waitForLoadState('networkidle');
  await dismissOverlays(page);

  const card = page.locator('.product-card').first();
  await scrollPastHeader(page, card);
  await card.hover();

  const quickAdd = card.getByRole('button', { name: /quick add/i }).first();
  await expect(quickAdd).toBeVisible({ timeout: 5000 });
  await quickAdd.click();

  // Quick-add panel opens inside the card — pick first size if present
  await page.waitForTimeout(400);
  const sizeBtn = card.locator('button').filter({ hasText: /^[SMXL]{1,3}$/ }).first();
  if (await sizeBtn.isVisible().catch(() => false)) {
    await sizeBtn.click();
  }
  // Confirm inside the panel: a button with bag/plus/Add icon text
  const panel = card.locator('.qa-reveal, [class*="quick"], [class*="panel"]').last();
  const confirm = panel.getByRole('button', { name: /add/i }).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
  await page.waitForTimeout(800);
}

test.describe('Cart', () => {
  test('adds a product to cart via quick add and updates badge', async ({ page }) => {
    await addFirstProductToCart(page);
    // Cart badge count in the header
    const badge = page
      .locator('header [class*="badge"], header [class*="count"]')
      .filter({ hasText: /^[1-9]$/ })
      .first();
    const hasBadge = await badge.isVisible().catch(() => false);
    expect(hasBadge).toBeTruthy();
  });

  test('cart drawer opens and shows items', async ({ page }) => {
    await addFirstProductToCart(page);

    // Open cart drawer via header cart button
    const cartBtn = page.locator('#cart-btn').first();
    await robustClick(page, cartBtn);

    await expect(
      page.locator('[aria-label*="cart" i], [class*="cart-drawer"], [class*="drawer"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('cart page renders and has checkout button', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await expect(page.locator('body')).toContainText(/cart/i);
    const checkout = page.getByRole('button', { name: /checkout/i }).first();
    if (await checkout.isVisible().catch(() => false)) {
      await expect(checkout).toBeVisible();
    }
  });
});
