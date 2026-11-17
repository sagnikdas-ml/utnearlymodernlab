import { test, expect } from '@playwright/test';

test('Featured recording is visible inline without expanding a control', async ({ page }) => {
  await page.route('**/api/recordings', route => route.fulfill({ json: { configured: false, items: [] } }));
  await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ body: '<html>Player</html>', contentType: 'text/html' }));
  await page.goto('/events/');
  await expect(page.locator('.video-frame iframe')).toBeVisible();
  await expect(page.locator('#recording-list details')).toHaveCount(0);
  await expect(page.locator('.video-frame iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/WdTGZ4d96uc');
});

test('Sheet rows replace the fallback safely and support an empty list', async ({ page }) => {
  await page.route('**/api/recordings', route => route.fulfill({ json: { configured: true, items: [{ title: '<b>Sheet talk</b>', speaker: 'Speaker', details: 'Details', date: '', videoId: 'WdTGZ4d96uc' }] } }));
  await page.goto('/events/');
  await expect(page.locator('#recording-list h4')).toHaveText('<b>Sheet talk</b>');
  await expect(page.locator('#recording-list b')).toHaveCount(0);
  await expect(page.locator('.video-frame iframe')).toBeVisible();
  await page.route('**/api/recordings', route => route.fulfill({ json: { configured: true, items: [] } }));
  await page.reload();
  await expect(page.locator('#recording-status')).toHaveText('No recordings are published yet.');
});

test('Workshop follows the team and assets are available', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#people + #workshops')).toBeVisible();
  for (const path of ['/assets/new-atlantis-poster.jpg', '/assets/new-atlantis-program.pdf']) {
    expect((await page.request.get(path)).ok()).toBe(true);
  }
});
