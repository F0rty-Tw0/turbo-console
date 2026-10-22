import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { BLANK_PAGE } from '../common/graph.const.ts';
import type { CpuSteps } from '../common/graph.type.ts';
import { spinPerStep } from '../test/utils/graph-spin-steps.spec.util.ts';
import { cpuStepsOf } from '../test/utils/graph-thread-time.spec.util.ts';

/** The CDP main-thread CPU clock the tripwires read, checked against busy-waits on a blank page in a fresh renderer. */
export class CpuClock {
  private readonly page: Page;
  private spins: CpuSteps | null;

  public constructor(page: Page) {
    this.page = page;
    this.spins = null;
  }

  /** Opens a blank page, then busy-waits `spinMs` per step for `steps` steps, keeping the CPU each step read. */
  public async spinSteps(steps: number, spinMs: number): Promise<void> {
    await this.page.goto(BLANK_PAGE);
    this.spins = await cpuStepsOf(this.page, async (endStep): Promise<void> => spinPerStep(this.page, steps, spinMs, endStep));
  }

  /** Every step of the last spin read more than `minMs` and less than `maxMs` of CPU; both are recorded as annotations. */
  public expectEveryStepBetween(minMs: number, maxMs: number): void {
    const spins = this.spins;

    if (spins === null) throw new Error('graph e2e: no spin ran');

    test.info().annotations.push({ type: 'spin-min-step-cpu-ms', description: spins.minStepMs.toFixed(1) });
    test.info().annotations.push({ type: 'spin-max-step-cpu-ms', description: spins.maxStepMs.toFixed(1) });
    expect(spins.minStepMs).toBeGreaterThan(minMs);
    expect(spins.maxStepMs).toBeLessThan(maxMs);
  }
}
