import { test, expect } from '@playwright/test';

/**
 * Smoke test suite — validates the deployed frontend is reachable
 * and the core UI elements are present.
 *
 * BASE_URL is set to the Vercel deployment in CI (see playwright.config.js).
 * Locally it hits http://localhost:5173 (Vite dev server).
 */

test.describe('Application smoke tests', () => {

  test('homepage loads and shows the migration tool header', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/migration/i);
    await expect(page.getByRole('heading', { name: /data migration tool/i })).toBeVisible();
  });

  test('source database connection form is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Source Database')).toBeVisible();
    await expect(page.getByText('Target Database')).toBeVisible();
  });

  test('Test Connection button is present for source', async ({ page }) => {
    await page.goto('/');
    const buttons = page.getByRole('button', { name: /test connection/i });
    await expect(buttons.first()).toBeVisible();
  });

  test('Protocol selector defaults to MongoDB for source', async ({ page }) => {
    await page.goto('/');
    // Source form is the first form on the page
    const selects = page.locator('select');
    await expect(selects.first()).toHaveValue('mongodb');
  });

});
