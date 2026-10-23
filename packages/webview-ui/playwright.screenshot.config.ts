/*
 * Theme screenshot baselines. Run by `pnpm --filter @turbo-console/webview-ui run screenshots`, never by `e2e`.
 * Only the CI `screenshots` job (the pinned Playwright container, Linux) produces or checks the baselines; a dev machine
 * renders other pixels and only proves the suite is stable on itself.
 *
 * Baseline procedure:
 * 1. Bootstrap or intended change: push; the job fails and uploads `test-results/`. Under `updateSnapshots: 'none'` a missing
 *    baseline fails before any capture (Playwright 1.64 `matchers/expect.js`, `toHaveScreenshot`), so a bootstrap run needs
 *    `--update-snapshots=all` on the CI command and the upload step pointed at `e2e/screenshots/` with `if: always()`;
 *    a changed shot uploads `test-results/<test>/<name>-actual.png`.
 * 2. Rerun the job once, or start a fresh run on the same tree; the two runs' PNGs must be byte-identical (`cmp`), else
 *    stop and decide a root fix or a tolerance.
 * 3. `gh run download <run> -n screenshots-diff-<attempt>` for both runs, `cmp` them; check each PNG by pixel: sample the
 *    canvas background, a node fill and a label colour per theme with ffmpeg and compare them with that theme's stub values.
 * 4. Copy the PNGs over `e2e/screenshots/` (drop any `-actual` suffix), commit, push; the job goes green.
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
