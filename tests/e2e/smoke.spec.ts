import { expect, test, type Page } from '@playwright/test';
import postgres from 'postgres';
import { copy } from '../../src/content/copy';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const TARGET = 'https://example.com/e2e/target?x=1';

// Only ever connects to the test database; refuses anything else.
function testSql() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set');
  if (!new URL(url).pathname.replace(/^\//, '').endsWith('_test')) {
    throw new Error('Refusing to touch a database whose name does not end with _test');
  }
  return postgres(url, { max: 1, prepare: false, onnotice: () => {} });
}

test.beforeEach(async () => {
  const sql = testSql();
  try {
    await sql`TRUNCATE links, clicks RESTART IDENTITY CASCADE`;
  } finally {
    await sql.end();
  }
});

test.afterAll(async () => {
  const sql = testSql();
  try {
    await sql`TRUNCATE links, clicks RESTART IDENTITY CASCADE`;
  } finally {
    await sql.end();
  }
});

const shortUrlLocator = (page: Page) =>
  page.locator('p').filter({ hasText: /^http:\/\/localhost:3100\/[^/\s]{7}$/ });
const statsUrlLocator = (page: Page) =>
  page.locator('p').filter({ hasText: /^http:\/\/localhost:3100\/stats\/\S+$/ });

async function createLink(page: Page, url: string) {
  await page.goto('/');
  await page.locator('#url').fill(url);
  await page.getByRole('button', { name: copy.home.submit }).click();
  await expect(page.getByRole('heading', { name: copy.result.heading })).toBeVisible();
  const shortUrl = (await shortUrlLocator(page).first().innerText()).trim();
  const statsUrl = (await statsUrlLocator(page).first().innerText()).trim();
  return { shortUrl, statsUrl };
}

test('create link, redirect, then stats show one click', async ({ page, request }) => {
  const { shortUrl, statsUrl } = await createLink(page, TARGET);

  expect(shortUrl).toMatch(/^http:\/\/localhost:3100\/[^/\s]{7}$/);
  expect(statsUrl).toMatch(/^http:\/\/localhost:3100\/stats\/\S+$/);
  await expect(page.getByText(copy.result.warningTitle)).toBeVisible();
  await expect(page.getByText(copy.result.warningBody)).toBeVisible();
  await expect(page.getByRole('button', { name: copy.result.copyShortLinkLabel })).toBeVisible();
  await expect(page.getByRole('button', { name: copy.result.copyStatsLinkLabel })).toBeVisible();
  await expect(page.getByRole('link', { name: copy.result.qrDownload })).toBeVisible();

  const qr = page.getByRole('img', { name: copy.result.qrAlt(shortUrl) });
  await expect(qr).toBeVisible();
  await expect
    .poll(() => qr.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  const res = await request.get(shortUrl, {
    maxRedirects: 0,
    headers: { 'user-agent': CHROME_UA },
  });
  expect(res.status()).toBe(302);
  expect(res.headers()['location']).toBe(TARGET);

  await page.goto(statsUrl);
  const total = page
    .locator('section')
    .filter({ has: page.locator('#total-label') })
    .locator('p')
    .nth(1);
  await expect(page.getByText(copy.stats.totalClicksLabel, { exact: true })).toBeVisible();
  await expect(total).toHaveText('1');
});

test('javascript: URL shows url_scheme error and no result', async ({ page }) => {
  await page.goto('/');
  await page.locator('#url').fill('javascript:alert(1)');
  await page.getByRole('button', { name: copy.home.submit }).click();
  await expect(page.getByText(copy.errors.url_scheme)).toBeVisible();
  await expect(page.getByRole('heading', { name: copy.result.heading })).toHaveCount(0);
});

test('expired link shows the 410 page', async ({ page }) => {
  const { shortUrl } = await createLink(page, TARGET);

  const sql = testSql();
  try {
    await sql`UPDATE links SET expires_at = now() - interval '1 minute'`;
  } finally {
    await sql.end();
  }

  const response = await page.goto(shortUrl);
  expect(response?.status()).toBe(410);
  await expect(page.getByRole('heading', { name: copy.statusPages.expired.title })).toBeVisible();
  await expect(page.getByText(copy.statusPages.expired.body)).toBeVisible();
});

test.describe('theme switch', () => {
  test.use({ colorScheme: 'light' });

  test('flips and persists across reload', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    const toggle = page.getByRole('switch', { name: copy.theme.toggleLabel });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => localStorage.getItem('stub-theme'))).toBe('dark');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });
});

test('bad stats token returns 404 with not-found copy', async ({ page }) => {
  const response = await page.goto('/stats/not-a-real-token');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: copy.notFound.title })).toBeVisible();
});
