import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) }));
});
test('Keyboard search, result navigation, focus restoration, and Mac shortcut', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('link', { name: 'Search the website', exact: true });
  await trigger.focus(); await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const input = dialog.getByRole('searchbox'); await expect(input).toBeFocused();
  await input.fill('Henry Power');
  const result = dialog.locator('.search-results a').first(); await expect(result).toContainText('Henry Power');
  await page.keyboard.press('ArrowDown'); await expect(result).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/research\/#the-experimental-philosophy-of-henry-power/);
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Meta+k'); await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.getByRole('link', { name: 'Search the website', exact: true }).click();
  await input.fill('qzxqzx'); await expect(dialog.getByRole('status')).toContainText('No results');
  await page.keyboard.press('Escape'); await expect(page.getByRole('link', { name: 'Search the website', exact: true })).toBeFocused();
});
test('All pages work on mobile without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/research/', '/publications/', '/events/', '/events/archive/', '/events/princeton-bucharest-nuremberg-2026/', '/events/rome-nuremberg-oxford-2026/', '/events/francis-bacon-2026/', '/about/', '/contact/', '/search/']) {
    const response = await page.goto(path); expect(response.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('link', { name: 'Search the website', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
});
test('Static pages and search directory remain usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }); const page = await context.newPage();
  await page.goto('http://127.0.0.1:8790/'); await expect(page.getByRole('heading', { name: 'Dana Jalobeanu', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Search the website', exact: true }).click();
  await expect(page.locator('#browse-pages a')).toHaveCount(10); await context.close();
});
test('Search failure offers retry and old bookmarks resolve', async ({ page }) => {
  await page.route('**/search-index.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/'); await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('could not load');
  await page.unroute('**/search-index.json'); await page.getByRole('button', { name: 'Retry search' }).click();
  await expect(page.getByRole('dialog').locator('.search-results a')).toHaveCount(6);
  await page.goto('/#publications'); await expect(page).toHaveURL('/publications/');
});
