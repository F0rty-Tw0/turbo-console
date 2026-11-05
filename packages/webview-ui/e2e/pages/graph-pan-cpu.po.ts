import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import { CPU_RUNS } from '../common/graph-tripwire.const.ts';
import type { CpuSteps } from '../common/graph.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { isPanNear } from '../test/utils/graph-camera.spec.util.ts';
import { medianCpuOf } from '../test/utils/graph-cpu-median.spec.util.ts';
import { dragBy } from '../test/utils/graph-scripted-pan.spec.util.ts';
import { recordPanCpu } from '../test/utils/graph-thread-time.spec.util.ts';

/** The pan CPU tripwires: three scripted pans from one camera, asserted on their medians. */
export class GraphPanCpu {
  private readonly page: Page;
  private readonly canvas: GraphCanvas;
  private readonly probe: GraphProbePage;
  private readings: CpuSteps[];

  public constructor(page: Page) {
    this.page = page;
    this.canvas = new GraphCanvas(page);
    this.probe = new GraphProbePage(page);
    this.readings = [];
  }

  /**
   * Runs the scripted pan three times from `spot`, or from an empty spot of the flat graph, dragging the camera back to
   * where the first run started before each later run, and keeps every run's CPU; the camera ends moved by one pan.
   */
  public async scriptedPans(warmUpFrames: number, panFrames: number, spot?: ViewportPoint): Promise<void> {
    const start = spot ?? (await this.canvas.emptySpot());
    const home = await this.currentPan();
    const readings: CpuSteps[] = [];

    for (let run = 0; run < CPU_RUNS; run += 1) {
      if (run > 0) await this.panHome(start, home);

      await this.canvas.scriptedPan(warmUpFrames, panFrames, start);

      const reading = this.canvas.measuredPanCpu();

      readings.push(reading);
    }

    this.readings = readings;
  }

  /**
   * The median of the scripted pans used a measured, non-zero total under `totalMs` of main-thread CPU, and their median
   * costliest step stayed under `stepMs`; every run and both medians are recorded as annotations and printed before the
   * asserts, so a failing run logs them too.
   */
  public expectPanCpuUnder(totalMs: number, stepMs: number): void {
    const readings = this.readings;

    if (readings.length === 0) throw new Error('graph e2e: no scripted pans ran');

    const pan = medianCpuOf(readings);

    recordPanCpu(test.info(), { readings, median: pan }, totalMs, stepMs);
    expect(pan.totalMs).toBeGreaterThan(0);
    expect(pan.totalMs).toBeLessThan(totalMs);
    expect(pan.maxStepMs).toBeLessThan(stepMs);
  }

  /** Drags the canvas back to pan `home`, grabbing where the content first under `start` now lies, and polls until it is there. */
  private async panHome(start: ViewportPoint, home: Position): Promise<void> {
    const now = await this.currentPan();
    const dx = home.x - now.x;
    const dy = home.y - now.y;
    const grab: ViewportPoint = { x: start.x - dx, y: start.y - dy };
    const isHome = async (): Promise<boolean> => {
      const pan = await this.probe.pan();

      return isPanNear(pan, home);
    };

    await dragBy(this.page, grab, dx, dy);
    await expect.poll(isHome, { message: 'the camera pans back to where the first scripted pan started' }).toBe(true);
  }

  private async currentPan(): Promise<Position> {
    const pan = await this.probe.pan();

    if (pan === null) throw new Error('graph e2e: the probe reports no pan');

    return pan;
  }
}
