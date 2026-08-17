// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config — assumes the dev servers are already running:
 *   - Vite frontend on http://localhost:5173 (proxies /api -> :8000)
 *   - Laravel backend on :8000
 *
 * `reuseExistingServer: true` lets us run against the live dev servers.
 * To start servers automatically instead, uncomment the webServer block.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 13'],
        // PWA install prompt can cover UI — dismiss via viewport tweaks if flaky
      },
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  // Uncomment to auto-start servers instead of relying on running ones:
  // webServer: [
  //   { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 60_000 },
  // ],
});
