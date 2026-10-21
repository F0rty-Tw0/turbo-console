import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphControlsPage } from './graph-controls.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import { postStates } from '../test/utils/graph-host-state.spec.util.ts';
import { largeState } from '../test/utils/graph-large.spec.util.ts';

type SampleType = 'controls-built-ms' | 'filter-applied-ms';

/** Every sample goes to the annotations; the smallest one must be under `ms`, as starvation rarely hits every sample. */
const expectMinUnder = (type: SampleType, samples: number[], ms: number): void => {
  for (const sample of samples) test.info().annotations.push({ type, description: String(sample) });

  expect(samples).not.toHaveLength(0);
  expect(Math.min(...samples)).toBeLessThan(ms);
};

const readFresh = async (read: () => Promise<number | null>): Promise<number> => {
  const sample = await read();

  if (sample === null) throw new Error('graph e2e: the probe has not measured the step that just showed');

  return sample;
};

/** Wall-time samples of the probe's timing facts, one per forced repeat of the step. */
export class GraphSamples {
  private readonly controls: GraphControlsPage;
  private readonly page: Page;
  private readonly timings: GraphTimings;
  private builtSamples: number[] = [];
  private appliedSamples: number[] = [];

  public constructor(page: Page) {
    this.page = page;
    this.controls = new GraphControlsPage(page);
    this.timings = new GraphTimings(page);
  }

  /** Sends a large state per count, each under its own hash so each rebuilds the panel; reads `controlsBuiltMs` once its count shows. */
  public async collectControlsBuilt(counts: number[]): Promise<void> {
    const samples: number[] = [];

    for (const count of counts) {
      await this.page.evaluate(postStates, [largeState(count)]);
      await this.controls.expectCount(count, count);
      samples.push(await readFresh(async (): Promise<number | null> => this.timings.controlsBuiltMs()));
    }

    this.builtSamples = samples;
  }

  /** Unchecks and rechecks `name` in turn; reads `filterAppliedMs` once the count shows the change. */
  public async collectFilterApplied(name: string, total: number, repeats: number): Promise<void> {
    const samples: number[] = [];

    for (let toggle = 0; toggle < repeats; toggle += 1) {
      const hiddenCount = toggle % 2 === 0 ? 1 : 0;

      await this.controls.toggleRow(name);
      await this.controls.expectCount(total - hiddenCount, total);
      samples.push(await readFresh(async (): Promise<number | null> => this.timings.filterAppliedMs()));
    }

    this.appliedSamples = samples;
  }

  public expectControlsBuiltMinUnder(ms: number): void {
    expectMinUnder('controls-built-ms', this.builtSamples, ms);
  }

  public expectFilterAppliedMinUnder(ms: number): void {
    expectMinUnder('filter-applied-ms', this.appliedSamples, ms);
  }
}
