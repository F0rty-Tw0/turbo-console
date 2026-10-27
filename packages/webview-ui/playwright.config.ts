import { defineConfig, devices } from '@playwright/test';

/**
 * macOS runners stall frame delivery on the GPU path: a folder toggle timed to the next render lands at 80-180 ms on
 * about a third of samples while synchronous timings stay normal (C82), so Chromium runs there without the GPU.
 */
const isMac = process.platform === 'darwin';
const NO_GPU_ARGS = ['--disable-gpu'];
const DEFAULT_ARGS: string[] = [];
const gpuArgs = isMac ? NO_GPU_ARGS : DEFAULT_ARGS;
const chromium = { ...devices['Desktop Chrome'], launchOptions: { args: gpuArgs } };

const projects = [{ name: 'chromium', use: chromium }];

const use = { trace: 'retain-on-failure' } as const;

export default defineConfig({
  projects,
  reporter: 'list',
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  use
});
