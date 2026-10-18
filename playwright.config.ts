import { defineConfig, devices } from '@playwright/test';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the shell environment.
}

const port = 3100;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  projects: [
    {
      name: 'chromium',
      // HeadlessChrome is filtered as a bot, so clicks would not be recorded.
      use: { ...devices['Desktop Chrome'], userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' },
    },
  ],
  webServer: {
    command: `npm run build && npm start -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      APP_URL: `http://localhost:${port}`,
      HASH_SECRET: process.env.HASH_SECRET ?? '',
    },
  },
});
