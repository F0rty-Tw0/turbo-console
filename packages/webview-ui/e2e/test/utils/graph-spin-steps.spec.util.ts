import type { Page } from '@playwright/test';

/** Runs in the page: keeps the main thread busy for `ms` of wall time. */
const spin = (ms: number): void => {
  const end = performance.now() + ms;

  while (performance.now() < end) {
    // Busy on purpose: the step must use CPU, not wait.
  }
};

/** Spins the page's main thread `spinMs` per step for `steps` steps, calling `endStep` after each. */
export const spinPerStep = async (page: Page, steps: number, spinMs: number, endStep: () => Promise<void>): Promise<void> => {
  for (let step = 0; step < steps; step += 1) {
    await page.evaluate(spin, spinMs);
    await endStep();
  }
};
