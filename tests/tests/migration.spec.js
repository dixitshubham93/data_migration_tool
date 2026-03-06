
import { test, expect } from '@playwright/test';


const MONGO_URL =
  'mongodb+srv://shubhamdixit:1234567890@mycluster.98leq.mongodb.net/?appName=MyCluster';
const MONGO_DB = 'sample_mflix';

const MYSQL = {
  host: 'localhost',
  port: '3306',
  username: 'root',
  password: 'root',
};



/** @param {import('@playwright/test').Page} page */
const srcCard = (page) =>
  page.locator('.bg-white.rounded-xl.shadow-lg').filter({ hasText: 'Source Database' });

/** @param {import('@playwright/test').Page} page */
const tgtCard = (page) =>
  page.locator('.bg-white.rounded-xl.shadow-lg').filter({ hasText: 'Target Database' });

// ─── Action Helpers ───────────────────────────────────────────────────────────

/**
 * @param {import('@playwright/test').Page} page
 */
async function connectMongo(page) {
  const src = srcCard(page);
 
  await src.locator('input[placeholder*="mongodb"]').fill(MONGO_URL);
  await src.getByRole('button', { name: 'Test Connection' }).click();
  
  await expect(
    src.locator('span').filter({ hasText: 'Connected' })
  ).toBeVisible({ timeout: 30_000 });
}

/**

 * @param {import('@playwright/test').Page} page
 */
async function selectMongoDb(page) {
  const src = srcCard(page);
  // After connection, a second <select> appears inside the source card for DB selection.
  // The first <select> is the Protocol dropdown; the DB picker is the second one.
  const dbSelect = src.locator('select').last();
  await expect(dbSelect).not.toBeDisabled({ timeout: 20_000 });
  await expect(
    dbSelect.locator(`option[value="${MONGO_DB}"]`)
  ).toBeAttached({ timeout: 20_000 });
  await dbSelect.selectOption(MONGO_DB);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function fillMysqlTarget(page) {
  const tgt = tgtCard(page);

  // 1. Ensure protocol is MySQL
  await tgt.locator('select').first().selectOption('mysql');

  // 2. Scope all inputs to the target card — use placeholder to distinguish them
  //    since both cards share the same placeholder strings, scoping to tgt is essential.
  await tgt.locator('input[placeholder="localhost"]').fill(MYSQL.host);
  await tgt.locator('input[placeholder="root"]').fill(MYSQL.username);
  // Port is type=number with placeholder "3306"
  await tgt.locator('input[placeholder="3306"]').fill(MYSQL.port);
  // Password is type=password — use type selector scoped to tgt card
  await tgt.locator('input[type="password"]').fill(MYSQL.password);
}

// Tests 

test.describe('DB Migrator — Core Flow', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Data Migration Tool' })
    ).toBeVisible();
  });

  // ── Test 1: Page loads ────────────────────────────────────────────────────
  test('1 | Page loads with title and both connection forms', async ({ page }) => {
    await expect(page).toHaveTitle(/Data Migration Tool|Vite/i);
    await expect(page.getByText('Source Database')).toBeVisible();
    await expect(page.getByText('Target Database')).toBeVisible();
    await expect(srcCard(page).getByRole('button', { name: 'Test Connection' })).toBeVisible();
    await expect(tgtCard(page).getByRole('button', { name: 'Test Connection' })).toBeVisible();
  });

  // ── Test 2: Source (MongoDB) connects ────────────────────────────────────
  test('2 | Source: MongoDB shows Connected after Test Connection', async ({ page }) => {
    await connectMongo(page);
    // DB picker label should appear in source card after connection
    await expect(srcCard(page).getByText('Select Database')).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 3: Target (MySQL) shows connection status ────────────────────────
  test('3 | Target: MySQL shows Connected or Connection Failed', async ({ page }) => {
    await fillMysqlTarget(page);
    await tgtCard(page).getByRole('button', { name: 'Test Connection' }).click();

    // Either "Connected" or "Connection Failed" is a valid outcome
    await expect(
      tgtCard(page).locator('span').filter({ hasText: /Connected|Connection Failed/ })
    ).toBeVisible({ timeout: 30_000 });
  });

  // ── Test 4: Full flow — Preview + Start Migration visible ─────────────────
  test('4 | Full flow: preview available and Start Migration visible (requires both DBs reachable)', async ({ page }) => {

    // ── Source ────────────────────────────────────────────────────────────────
    await connectMongo(page);
    await selectMongoDb(page);

    // Enable "Migrate All" toggle (appears after a DB is selected)
    const src = srcCard(page);
    await expect(
  src.locator('label:has-text("Collections")')
).toBeVisible({ timeout: 20_000 });
    await src
      .locator('div')
      .filter({ hasText: 'Migrate All' })
      .locator('div[class*="rounded-full"]')
      .first()
      .click();
    await expect(
      src.locator('text=/All .* collections will be migrated/')
    ).toBeVisible({ timeout: 5_000 });

    // ── Target ────────────────────────────────────────────────────────────────
    await fillMysqlTarget(page);
    await tgtCard(page).getByRole('button', { name: 'Test Connection' }).click();

    const tgt = tgtCard(page);
    await expect(
      tgt.locator('span').filter({ hasText: /Connected|Connection Failed/ })
    ).toBeVisible({ timeout: 30_000 });

    // Skip preview checks if MySQL is not reachable in this environment
    const mysqlConnected = await tgt
      .locator('span').filter({ hasText: 'Connected' })
      .isVisible();

    if (!mysqlConnected) {
      test.skip(/* MySQL not available — skipping preview & migration CTA checks */);
      return;
    }

    // ── Preview ───────────────────────────────────────────────────────────────
    const previewBtn = page.getByRole('button', { name: 'Preview Data' });
    await expect(previewBtn).toBeVisible({ timeout: 10_000 });
    await previewBtn.click();

    // Loading state
    await expect(page.locator('text=Loading data preview')).toBeVisible({ timeout: 5_000 });

    // Wait for collection headings (Atlas can be slow — allow 60 s)
    await expect(
      page.locator('h3').filter({ hasText: /Collection:/ }).first()
    ).toBeVisible({ timeout: 60_000 });

    // ── Start Migration CTA ───────────────────────────────────────────────────
    await expect(
      page.getByRole('button', { name: /Start Migration/i })
    ).toBeVisible({ timeout: 10_000 });
  });

});
