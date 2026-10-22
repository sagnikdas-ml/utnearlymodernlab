import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:8790', channel: 'msedge', headless: true },
  webServer: { command: 'npm run dev -- --port 8790', url: 'http://127.0.0.1:8790', reuseExistingServer: false, timeout: 60000 },
});
