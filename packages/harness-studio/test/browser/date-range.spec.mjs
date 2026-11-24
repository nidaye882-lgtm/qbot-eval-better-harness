import { expect, test } from '@playwright/test';
import { startDateRangeFixture } from './fixtures/date-range.mjs';

let studio;

test.beforeEach(async () => { studio = await startDateRangeFixture(); });
test.afterEach(async () => { await studio.close(); });

function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

/** Local midnight `offset` days from today, in the same zone the browser uses. */
function startOfLocalDay(offset) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getTime();
}

test('Yesterday filters the shared window and survives a reload', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.request.post(`${studio.url}/api/projects/open`);
  await page.goto(`${studio.url}/#/sessions`);
  const range = page.getByRole('combobox', { name: 'Observation window' });
  await expect(range.locator('option[value="yesterday"]')).toHaveText('Yesterday');
  // The default thirty-day window holds today and the two days before it.
  await expect(page.locator('.workbench-list > article')).toHaveCount(3);
  await range.selectOption('yesterday');
  await expect(page.locator('.workbench-list > article')).toHaveCount(1);
  await expect(page.locator('.workbench-list')).toContainText('Yesterday workflow');
  await expect(page.locator('.workbench-list')).not.toContainText('Today workflow');
  await page.reload();
  await expect(range).toHaveValue('yesterday');
  await expect(page.locator('.workbench-list > article')).toHaveCount(1);
  // Opening loaded the whole catalog, so narrowing never asked the server again.
  expect(studio.discoverCalls).toHaveLength(1);
  expect(studio.discoverCalls[0].window).toBeUndefined();
  for (const theme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: theme });
    for (const layout of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(layout);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('yesterday-wide.png'), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('a scan loaded for today does not cover yesterday, so the next selection re-scans', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.request.post(`${studio.url}/api/projects/open`);
  await page.goto(`${studio.url}/#/sessions`);
  const range = page.getByRole('combobox', { name: 'Observation window' });
  const scans = [];
  page.on('request', request => {
    if (request.method() === 'POST' && request.url().includes('/scan')) scans.push(new URL(request.url()));
  });

  await range.selectOption('today');
  await expect(page.locator('.workbench-list > article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Rescan project', exact: true }).click();
  await expect.poll(() => scans.length).toBe(1);
  expect(scans[0].searchParams.get('fromMs')).toBe(String(startOfLocalDay(0)));
  expect(scans[0].searchParams.get('toMs')).toBe(String(startOfLocalDay(1) - 1));
  await expect(page.locator('.workbench-list')).toContainText('Today workflow');

  // The loaded window now ends at today's last instant, so Yesterday is a
  // question the scan has not answered and must be fetched.
  await range.selectOption('yesterday');
  await expect.poll(() => scans.length).toBe(2);
  expect(scans[1].searchParams.get('fromMs')).toBe(String(startOfLocalDay(-1)));
  expect(scans[1].searchParams.get('toMs')).toBe(String(startOfLocalDay(0) - 1));
  await expect(page.locator('.workbench-list > article')).toHaveCount(1);
  await expect(page.locator('.workbench-list')).toContainText('Yesterday workflow');
});
