import type { Page } from '@playwright/test';

import { GraphDetailsTrace } from './graph-details-trace.po.ts';
import { GraphDetailsPage } from './graph-details.po.ts';
import { GraphPackageList } from './graph-package-list.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import { GraphPage } from './graph.po.ts';
import { postStates } from '../test/utils/graph-host-state.spec.util.ts';
import { largeState } from '../test/utils/graph-large.spec.util.ts';
import { expectMinUnder } from '../test/utils/graph-min-under.spec.util.ts';

const HUB_NAME = 'pkg-000';

const FAR_NAME = 'pkg-299';

const EMPTY_TITLE = 'Details';

const TRACE_TITLE = 'Trace';

const readFresh = async (read: () => Promise<number | null>): Promise<number> => {
  const sample = await read();

  if (sample === null) throw new Error('graph e2e: the probe has not measured the step that just showed');

  return sample;
};

/** Builds `repeats` times, putting the view back with `reset` between two builds, so the last build stays on screen. */
const sampleEach = async (repeats: number, build: () => Promise<number>, reset: () => Promise<void>): Promise<number[]> => {
  const samples: number[] = [];

  for (let sample = 0; sample < repeats; sample += 1) {
    if (sample > 0) await reset();

    samples.push(await build());
  }

  return samples;
};

/** Wall-time samples of the probe's timing facts, one per forced repeat of the step. */
export class GraphSamples {
  private readonly details: GraphDetailsPage;
  private readonly graph: GraphPage;
  private readonly list: GraphPackageList;
  private readonly page: Page;
  private readonly timings: GraphTimings;
  private readonly trace: GraphDetailsTrace;
  private builtSamples: number[] = [];
  private appliedSamples: number[] = [];
  private detailsSamples: number[] = [];
  private pickingSamples: number[] = [];
  private traceSamples: number[] = [];

  public constructor(page: Page) {
    this.page = page;
    this.details = new GraphDetailsPage(page);
    this.graph = new GraphPage(page);
    this.list = new GraphPackageList(page);
    this.timings = new GraphTimings(page);
    this.trace = new GraphDetailsTrace(page);
  }

  /** Sends a large state per count, each under its own hash so each rebuilds the panel; reads `controlsBuiltMs` once its count shows. */
  public async collectControlsBuilt(counts: number[]): Promise<void> {
    const samples: number[] = [];

    for (const count of counts) {
      const json = JSON.stringify([largeState(count)]);

      await this.page.evaluate(postStates, json);
      await this.waitForCount(count, count);
      samples.push(await readFresh(async (): Promise<number | null> => this.timings.controlsBuiltMs()));
    }

    this.builtSamples = samples;
  }

  /** Unchecks and rechecks `name` in turn; reads `filterAppliedMs` once the count shows the change. */
  public async collectFilterApplied(name: string, total: number, repeats: number): Promise<void> {
    const samples: number[] = [];

    for (let toggle = 0; toggle < repeats; toggle += 1) {
      const hiddenCount = toggle % 2 === 0 ? 1 : 0;

      await this.list.toggleRow(name);
      await this.waitForCount(total - hiddenCount, total);
      samples.push(await readFresh(async (): Promise<number | null> => this.timings.filterAppliedMs()));
    }

    this.appliedSamples = samples;
  }

  /** On the hub graph: picks `pkg-000` and reads `detailsBuiltMs`, `repeats` times; the last view stays up. */
  public async collectDetailsBuilt(repeats: number): Promise<void> {
    const build = async (): Promise<number> => {
      await this.list.pick(HUB_NAME);
      await this.details.expectHeading(HUB_NAME);

      return readFresh(async (): Promise<number | null> => this.timings.detailsBuiltMs());
    };
    const reset = async (): Promise<void> => {
      await this.graph.pressButton('Clear selection');
      await this.details.expectHeading(EMPTY_TITLE);
    };

    this.detailsSamples = await sampleEach(repeats, build, reset);
  }

  /** On the hub graph: `pkg-000` picked once, then Start trace and `pickingBuiltMs` `repeats` times; the last picking view stays up. */
  public async collectPickingBuilt(repeats: number): Promise<void> {
    const build = async (): Promise<number> => {
      await this.details.startTrace();
      await this.details.expectHeading(`Trace from ${HUB_NAME}`);

      return readFresh(async (): Promise<number | null> => this.timings.pickingBuiltMs());
    };
    const reset = async (): Promise<void> => {
      await this.trace.cancel();
      await this.details.expectHeading(HUB_NAME);
    };

    await this.list.pick(HUB_NAME);
    await this.details.expectHeading(HUB_NAME);

    this.pickingSamples = await sampleEach(repeats, build, reset);
  }

  /** On the 300-package graph: `pkg-299` picked once, then a trace to `pkg-000` and `traceMs` `repeats` times; the last trace stays up. */
  public async collectTraceBuilt(repeats: number): Promise<void> {
    const build = async (): Promise<number> => {
      await this.details.startTrace();
      await this.list.pick(HUB_NAME);
      await this.details.expectHeading(TRACE_TITLE);

      return readFresh(async (): Promise<number | null> => this.timings.traceMs());
    };
    const reset = async (): Promise<void> => {
      await this.trace.clearTrace();
      await this.details.expectHeading(FAR_NAME);
    };

    await this.list.pick(FAR_NAME);
    await this.details.expectHeading(FAR_NAME);

    this.traceSamples = await sampleEach(repeats, build, reset);
  }

  public expectControlsBuiltMinUnder(ms: number): void {
    expectMinUnder('controls-built-ms', this.builtSamples, ms);
  }

  public expectFilterAppliedMinUnder(ms: number): void {
    expectMinUnder('filter-applied-ms', this.appliedSamples, ms);
  }

  public expectDetailsBuiltMinUnder(ms: number): void {
    expectMinUnder('details-built-ms', this.detailsSamples, ms);
  }

  public expectPickingBuiltMinUnder(ms: number): void {
    expectMinUnder('picking-built-ms', this.pickingSamples, ms);
  }

  public expectTraceMinUnder(ms: number): void {
    expectMinUnder('trace-ms', this.traceSamples, ms);
  }

  /** Waits, without asserting, until the count line reads `visible` of `total`. */
  private async waitForCount(visible: number, total: number): Promise<void> {
    await this.page.getByText(`Showing ${visible} of ${total} packages`, { exact: true }).waitFor();
  }
}
