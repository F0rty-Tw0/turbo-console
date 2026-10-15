import { defineConfig, devices } from '@playwright/test';

const chromium = { ...devices['Desktop Chrome'] };

const projects = [{ name: 'chromium', use: chromium }];

const use = { trace: 'retain-on-failure' } as const;

export default defineConfig({
  projects,
  reporter: 'list',
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use
});
