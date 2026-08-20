import { test, expect } from '@playwright/test';
import { dismissOverlays, robustClick, scrollPastHeader } from './helpers.js';

// ── Test data ──
const TEST_CUSTOMER = {
  email: 'customer@threvolt.com',
  password: 'Demo@123',
};

const GUEST_ADDRESS = {
  firstName: 'Guest',
  lastName: 'User',
  email: 'guest.e2e@test.com',
  addressLine1: '42 Test Street',
  city: 'Mumbai',
  state: 'Maharashtra',
  zipCode: '400001',
  phone: '9876543210',
};

const LOGGED_IN_ADDRESS = {
  firstName: 'Demo',
  lastName: 'Customer',
  email: 'customer@threvolt.com',
  addressLine1: '123, MG Road',
  city: 'Bangalore',
  state: 'Karnataka',
  zipCode: '560001',
  phone: '9876543210',
};

// ── Helpers ──

/** Add the first available product to cart via quick-add */
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

  // Quick-add panel — pick first size if available
  await page.waitForTimeout(400);
  const sizeBtn = card.locator('button').filter({ hasText: /^[SMXL]{1,3}$/ }).first();
  if (await sizeBtn.isVisible().catch(() => false)) {
    await sizeBtn.click();
  }
  // Confirm add to cart
  const panel = card.locator('.qa-reveal, [class*="quick"], [class*="panel"]').last();
  const confirm = panel.getByRole('button', { name: /add/i }).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click();
  }
  await page.waitForTimeout(800);
}

/** Fill in the checkout shipping form */
async function fillShippingForm(page, addr) {
  await page.locator('#checkout-firstname').fill(addr.firstName);
  await page.locator('#checkout-lastname').fill(addr.lastName);
  await page.locator('#checkout-email').fill(addr.email);
  await page.locator('#checkout-address1').fill(addr.addressLine1);
  await page.locator('#checkout-city').fill(addr.city);
  await page.locator('#checkout-state').fill(addr.state);
  await page.locator('#checkout-pincode').fill(addr.zipCode);
  await page.locator('#checkout-phone').fill(addr.phone);
}

/** Login via the login page */
async function loginAs(page, user) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await dismissOverlays(page);

  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill(user.password);
  await page.getByRole('button', { name: /sign in|login|log in/i }).first().click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/** Select a payment method by its label text */
async function selectPayment(page, methodName) {
  const method = page.locator('label').filter({ hasText: new RegExp(methodName, 'i') }).first();
  await method.scrollIntoViewIfNeeded();
  await method.click();
}

// ════════════════════════════════════════════════════════════════
//  GUEST CHECKOUT — COD
// ════════════════════════════════════════════════════════════════
test.describe('Order Flow — Guest + COD', () => {
  test('guest can add item, fill form, and place COD order', async ({ page }) => {
    // 1. Add a product to cart
    await addFirstProductToCart(page);

    // 2. Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Should show the login prompt for guest users
    const loginPrompt = page.locator('text=Already have an account');
    await expect(loginPrompt).toBeVisible({ timeout: 5000 });

    // 3. Fill shipping address
    await fillShippingForm(page, GUEST_ADDRESS);

    // 4. Select COD payment (should be default, but click to be sure)
    await selectPayment(page, 'Cash on Delivery');

    // 5. Verify the Place Order button is visible
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await expect(placeOrderBtn).toBeVisible();

    // 6. Click Place Order
    await placeOrderBtn.click();

    // 7. Wait for order creation (redirect to thank-you page)
    await page.waitForURL(/\/order\/thank-you\//, { timeout: 20_000 });

    // 8. Verify thank-you page
    await expect(page.locator('body')).toContainText(/thank you|order.*confirm|success/i);
  });

  test('guest can place COD order with create-account option', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await fillShippingForm(page, {
      ...GUEST_ADDRESS,
      email: 'newuser.e2e@test.com',
    });

    // Enable create-account toggle
    const createAccountToggle = page.locator('text=Create an account').first();
    await createAccountToggle.scrollIntoViewIfNeeded();
    await createAccountToggle.click();
    await page.waitForTimeout(400);

    // Set password
    const passwordInput = page.locator('#checkout-password');
    await expect(passwordInput).toBeVisible({ timeout: 3000 });
    await passwordInput.fill('TestPass123!');

    // Select COD
    await selectPayment(page, 'Cash on Delivery');

    // Place order
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await placeOrderBtn.click();

    // Should redirect to thank-you page
    await page.waitForURL(/\/order\/thank-you\//, { timeout: 20_000 });
    await expect(page.locator('body')).toContainText(/thank you|order.*confirm|success/i);
  });

  test('guest checkout shows required field validation', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Try to place order without filling form
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await placeOrderBtn.click();
    await page.waitForTimeout(1000);

    // Should stay on checkout (not redirect to thank-you)
    expect(page.url()).toContain('/checkout');
  });
});

// ════════════════════════════════════════════════════════════════
//  GUEST CHECKOUT — Razorpay
// ════════════════════════════════════════════════════════════════
test.describe('Order Flow — Guest + Razorpay', () => {
  test('guest can fill checkout form and select Razorpay', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await fillShippingForm(page, GUEST_ADDRESS);

    // Select Razorpay
    await selectPayment(page, 'Razorpay');

    // Verify Razorpay is selected (radio checked)
    const razorpayRadio = page.locator('input[type="radio"][name="payment"]').nth(0);
    // The exact index depends on display order — verify via label
    const razorpayLabel = page.locator('label').filter({ hasText: /razorpay/i }).first();
    await expect(razorpayLabel).toHaveClass(/border-black/);

    // Verify Place Order button shows
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await expect(placeOrderBtn).toBeVisible();
  });
});

// ════════════════════════════════════════════════════════════════
//  LOGGED-IN CHECKOUT — COD
// ════════════════════════════════════════════════════════════════
test.describe('Order Flow — Logged-in + COD', () => {
  test('logged-in user can place COD order', async ({ page }) => {
    // 1. Login
    await loginAs(page, TEST_CUSTOMER);

    // 2. Add a product to cart
    await addFirstProductToCart(page);

    // 3. Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Should NOT show the login prompt (already authenticated)
    const loginPrompt = page.locator('text=Already have an account');
    await expect(loginPrompt).not.toBeVisible();

    // 4. Fill shipping address (pre-filled addresses may exist, but fill anyway)
    await fillShippingForm(page, LOGGED_IN_ADDRESS);

    // 5. Select COD
    await selectPayment(page, 'Cash on Delivery');

    // 6. Place order
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await placeOrderBtn.click();

    // 7. Wait for redirect
    await page.waitForURL(/\/order\/thank-you\//, { timeout: 20_000 });

    // 8. Verify thank-you page
    await expect(page.locator('body')).toContainText(/thank you|order.*confirm|success/i);
  });

  test('logged-in user sees saved addresses and checkout form', async ({ page }) => {
    await loginAs(page, TEST_CUSTOMER);

    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // The checkout page should render properly
    const shippingHeading = page.locator('h2:has-text("Shipping Address")');
    await expect(shippingHeading).toBeVisible({ timeout: 5000 });

    // Payment section should exist
    const paymentHeading = page.locator('h2:has-text("Payment Method")');
    await expect(paymentHeading).toBeVisible({ timeout: 5000 });
  });
});

// ════════════════════════════════════════════════════════════════
//  LOGGED-IN CHECKOUT — Razorpay
// ════════════════════════════════════════════════════════════════
test.describe('Order Flow — Logged-in + Razorpay', () => {
  test('logged-in user can select Razorpay and reach payment', async ({ page }) => {
    await loginAs(page, TEST_CUSTOMER);
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await fillShippingForm(page, LOGGED_IN_ADDRESS);
    await selectPayment(page, 'Razorpay');

    // Place order — Razorpay modal won't open in test (no real key),
    // but we verify the order is created and the page attempts payment
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await placeOrderBtn.click();

    // Either redirect to thank-you or show Razorpay error (both acceptable in test)
    await page.waitForTimeout(5000);
    const url = page.url();
    const isThankYou = url.includes('/order/thank-you/');
    const hasError = await page.locator('text=/payment.*fail|error|razorpay/i').isVisible().catch(() => false);

    // At least one should be true: either order placed or payment attempted
    expect(isThankYou || hasError).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════
//  CHECKOUT PAGE — General UI tests
// ════════════════════════════════════════════════════════════════
test.describe('Checkout — UI & Navigation', () => {
  test('empty cart shows "Your cart is empty" on checkout', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await expect(page.locator('text=Your cart is empty')).toBeVisible({ timeout: 5000 });
    const shopNowBtn = page.getByRole('link', { name: /shop now/i }).first();
    await expect(shopNowBtn).toBeVisible();
  });

  test('checkout has progress steps bar', async ({ page }) => {
    // Need items in cart to see checkout form
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Progress bar: Cart > Information > Payment (scope to main to avoid header cart button)
    const progressBar = page.getByRole('main');
    await expect(progressBar.getByRole('button', { name: 'Cart', exact: true })).toBeVisible();
    await expect(progressBar.getByRole('button', { name: 'Information', exact: true })).toBeVisible();
    await expect(progressBar.getByRole('button', { name: 'Payment', exact: true })).toBeVisible();
  });

  test('back to cart link works from checkout', async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    // Desktop: use the desktop-visible back button (hidden md:flex)
    const backBtn = page.locator('.md\\:flex:has-text("Back to cart")').first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
    await backBtn.click();

    await page.waitForURL(/\/cart/, { timeout: 10_000 });
  });
});

// ════════════════════════════════════════════════════════════════
//  ORDER CONFIRMATION — Thank-you page
// ════════════════════════════════════════════════════════════════
test.describe('Thank You Page', () => {
  test('thank-you page shows order confirmation after COD order', async ({ page }) => {
    // Full flow: add → checkout → COD → thank-you
    await addFirstProductToCart(page);
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await dismissOverlays(page);

    await fillShippingForm(page, GUEST_ADDRESS);
    await selectPayment(page, 'Cash on Delivery');

    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).first();
    await placeOrderBtn.click();

    await page.waitForURL(/\/order\/thank-you\//, { timeout: 20_000 });

    // Thank-you page should show confirmation
    await expect(
      page.locator('body').filter({ hasText: /thank you|order|confirm|success|placed/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
