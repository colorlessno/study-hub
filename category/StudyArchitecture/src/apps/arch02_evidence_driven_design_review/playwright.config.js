import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:43702',
    screenshot: 'only-on-failure',
    trace: 'on'
  },
  webServer: {
    command: 'node app/server.js',
    url: 'http://127.0.0.1:43702/ready',
    reuseExistingServer: true
  }
});
