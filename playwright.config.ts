import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/myNotes/`;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // The app defaults to German for an unrecognized browser locale; pin it so these
    // (German-language) assertions don't depend on the runner's default locale (often en-US).
    locale: 'de-DE',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    },
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'android-chrome-emulation',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
