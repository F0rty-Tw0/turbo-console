/*
 * Theme screenshot baselines. Run by `pnpm --filter @turbo-console/webview-ui run screenshots`, never by `e2e`.
 * Only the CI `screenshots` job (the pinned Playwright container, Linux) produces or checks the baselines; a dev machine
 * renders other pixels and only proves the suite is stable on itself.
 *
 * Baseline procedure (new or changed screenshots; push and PR runs never write baselines):
 * 1. Push the branch, then `gh workflow run ci.yml --ref <branch> -f update-snapshots=true`. That run skips `check`,
 *    runs the suite with `--update-snapshots=all` and, only when it passes, uploads `e2e/screenshots/` as
 *    `screenshots-baselines-<attempt>`. The `screenshots (update baselines)` job must be green.
 * 2. Rerun the job once (or dispatch again); `gh run download <run> -n screenshots-baselines-<n> -D run-<n>` each into
 *    its own folder and `cmp` file by file. They must be byte-identical, else stop and decide a root fix or a tolerance.
 * 3. Check each PNG by pixel: sample the canvas background, a node fill and a label colour per theme with ffmpeg and
 *    compare them with that theme's stub values.
 * 4. Copy the PNGs over `e2e/screenshots/`, commit, push; the job goes green.
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Partial raster re-rasters only a changed element's ink rect, so the LCD subpixel fringe of text set after first paint
 * (the toolbar status line) lands or not depending on tile history; a full re-raster makes the pixels repeat.
 */
const launchOptions = { args: ['--disable-partial-raster'] };

const viewport = { width: 1280, height: 800 };

const chromium = {
  ...devices['Desktop Chrome'],
  viewport,
  deviceScaleFactor: 1,
  launchOptions
};

const projects = [{ name: 'chromium', use: chromium }];

const toHaveScreenshot = { animations: 'disabled', caret: 'hide', threshold: 0, maxDiffPixels: 0 } as const;

const expect = { toHaveScreenshot };

export default defineConfig({
  projects,
  reporter: 'list',
  testDir: './e2e',
  testMatch: '**/*.screenshot.ts',
  snapshotPathTemplate: '{testDir}/screenshots/{arg}{ext}',
  updateSnapshots: 'none',
  expect
});
