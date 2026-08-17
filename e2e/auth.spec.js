import { test, expect } from '@playwright/test';
import { dismissOverlays } from './helpers.js';

/**
 * Auth — login form, protected routes redirect to login.
 */
test.describe('Auth', () => {
  test('login page renders and validates empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Submit empty -> browser validation blocks navigation
    await page.locator('#login-email').fill('');
    await page.locator('#login-password').fill('');
    await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();
    await page.waitForTimeout(800);
    expect(page.url()).toContain('/login');
  });

  test('register page renders all required fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await expect(page.locator('#reg-firstname')).toBeVisible();
    await expect(page.locator('#reg-lastname')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
  });

  test('protected wishlist page redirects to login', async ({ page }) => {
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  });
});
