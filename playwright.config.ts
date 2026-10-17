import { defineConfig, devices } from '@playwright/test';

const runId = process.env.TEST_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 1,
  outputDir: `reports/browser-${runId}/artifacts`,
  reporter: [['list'], ['json', { outputFile: `reports/browser-${runId}.json` }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'node server.mjs',
    env: {CROREPATI_NO_NETWORK:'1',CROREPATI_DATA_DIR:'/tmp/crorepati-e2e-live'},
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'], browserName: 'chromium' } },
  ],
});
