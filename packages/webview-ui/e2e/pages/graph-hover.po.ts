import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdge, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { CPU_RUNS } from '../common/graph-tripwire.const.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { CpuRuns, CpuSteps } from '../common/graph.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { medianCpuOf } from '../test/utils/graph-cpu-median.spec.util.ts';
import { recordHoverCpu } from '../test/utils/graph-hover-cpu.spec.util.ts';
import { emptySpotOn, lineMidpointOf, readEdgeLines } from '../test/utils/graph-lines.spec.util.ts';
import { forcesRender, rendersSoFar } from '../test/utils/graph-quiet-canvas.spec.util.ts';
import { cpuStepsOf } from '../test/utils/graph-thread-time.spec.util.ts';

/** The span one step stands for when `hoverFlowCpu` sizes a run; a step takes about two frames, so it is not a frame. */
const STEP_SPAN_MS = 16;

/** Each step the pointer sits 1 px right of the node's centre or on it, so it moves yet stays on the node. */
const NUDGE_PX = 1;

/** How far above the canvas's box `leaveCanvas` puts the pointer. */
const LEAVE_GAP_PX = 4;

/** The pointer resting on the drawn graph, aimed through the probe's rendered node centres. */
export class GraphHover {
  protected readonly page: Page;
  protected readonly container: Locator;
  protected readonly probe: GraphProbePage;
  private hoverCpu: CpuSteps[];
  private hoverRenders: number[];
  private point: ViewportPoint | null;

  public constructor(page: Page) {
    this.page = page;
    this.hoverCpu = [];
    this.hoverRenders = [];
    this.point = null;
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  /** Moves the pointer onto node `id` and lets a frame draw; the pointer stays there. */
  public async overNode(id: string): Promise<void> {
    const node = await this.nodeOf(id);
    const centre: ViewportPoint = { x: node.renderedX, y: node.renderedY };

    await this.moveTo(centre);
  }

  /** Moves the pointer onto the middle of the `source` to `target` link's drawn line and lets a frame draw. */
  public async overLink(source: string, target: string): Promise<void> {
    await this.probe.waitForNodes();

    const lines = await readEdgeLines(this.page);
    const midpoint = lineMidpointOf(lines, source, target);

    await this.moveTo(midpoint);
  }

  /** Moves the pointer to an empty spot of the canvas, off every node and link, and lets a frame draw. */
  public async overBackground(): Promise<void> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();
    const spot: ViewportPoint = await emptySpotOn(this.page, container, nodes, zoom);

    await this.moveTo(spot);
  }

  /** Moves the pointer just above the canvas's box, off the container, and lets a frame draw. */
  public async leaveCanvas(): Promise<void> {
    const container = await this.container.evaluate(readRect);
    const x = container.left + container.width / 2;
    const y = container.top - LEAVE_GAP_PX;
    const above: ViewportPoint = { x, y };

    await this.moveTo(above);
  }

  /** Where the last `over*` or `leaveCanvas` left the pointer; throws before the first. */
  protected restingPoint(): ViewportPoint {
    const { point } = this;

    if (point === null) throw new Error('graph e2e: the pointer has not been moved');

    return point;
  }

  /**
   * Rests the pointer on node `id`, then runs the nudge three times: each run nudges it 1 px per step for `spanMs / 16`
   * steps (3000 gives 188), keeping the main-thread CPU each step took. A step is a mouse move plus one
   * `requestAnimationFrame` round trip, about two frames, so a run lasts about twice `spanMs` of wall time (188 steps
   * take about 6 s). The pointer keeps moving, so the flow overlay never reaches its idle stop and draws throughout.
   * Also counts the Cytoscape renders each run caused; the hover-enter paint happens in `overNode`, before any measure starts.
   */
  public async hoverFlowCpu(id: string, spanMs: number): Promise<void> {
    await this.overNode(id);

    const node = await this.nodeOf(id);
    const steps = Math.ceil(spanMs / STEP_SPAN_MS);
    const readings: CpuSteps[] = [];
    const renders: number[] = [];

    for (let run = 0; run < CPU_RUNS; run += 1) {
      const rendersBefore = await this.renderCount();
      const reading = await this.nudgeCpu(node, steps);
      const rendersAfter = await this.renderCount();

      readings.push(reading);
      renders.push(rendersAfter - rendersBefore);
    }

    this.hoverCpu = readings;
    this.hoverRenders = renders;
  }

  /** Every run of the last `hoverFlowCpu` and their per-field median; throws when none ran. */
  public measuredHoverCpu(): CpuRuns {
    const readings = this.hoverCpu;

    if (readings.length === 0) throw new Error('graph e2e: no hover-flow run was measured');

    const median = medianCpuOf(readings);
    const runs: CpuRuns = { readings, median };

    return runs;
  }

  /** Redraws the canvas at once, so the draw that follows a style change happens here and not during a later measure. */
  public async redrawNow(): Promise<void> {
    await this.page.evaluate(forcesRender);
  }

  /** The Cytoscape renders during each run of the last `hoverFlowCpu`; throws when none ran. */
  public measuredHoverRenders(): number[] {
    const renders = this.hoverRenders;

    if (renders.length === 0) throw new Error('graph e2e: no hover-flow run was measured');

    return renders;
  }

  /**
   * The median of the last `hoverFlowCpu`'s runs used a measured, non-zero total under `totalMs` of main-thread CPU, and
   * their median costliest step stayed under `stepMs`; every run, both medians and every run's renders are recorded and
   * printed before the asserts, so a failing run logs them too.
   */
  public expectHoverCpuUnder(totalMs: number, stepMs: number): void {
    const runs = this.measuredHoverCpu();
    const { median } = runs;

    recordHoverCpu(test.info(), runs, this.measuredHoverRenders(), { totalMs, stepMs });
    expect(median.totalMs).toBeGreaterThan(0);
    expect(median.totalMs).toBeLessThan(totalMs);
    expect(median.maxStepMs).toBeLessThan(stepMs);
  }

  /** No run of the last `hoverFlowCpu` made Cytoscape render more than `limit` times: the flow stayed on its overlay. */
  public expectHoverRendersAtMost(limit: number): void {
    const renders = this.measuredHoverRenders();
    const most = Math.max(...renders);

    expect(most).toBeLessThanOrEqual(limit);
  }

  /** At least one drawn edge reads `highlighted`: the hovered chain is lit, so the flow has edges to draw. */
  public async expectLitEdges(): Promise<void> {
    const isLit = (edge: ProbeEdge): boolean => edge.isDrawn && edge.state === 'highlighted';

    const litCount = async (): Promise<number> => {
      const edges = await this.probe.edges();

      return edges.filter(isLit).length;
    };

    await expect.poll(litCount).toBeGreaterThan(0);
  }

  /** Nudges the pointer 1 px per step on `node` for `steps` steps, letting a frame draw each step, and returns the main-thread CPU each step took. */
  private async nudgeCpu(node: ProbeNode, steps: number): Promise<CpuSteps> {
    return cpuStepsOf(this.page, async (endStep): Promise<void> => {
      for (let step = 1; step <= steps; step += 1) {
        await this.page.mouse.move(node.renderedX + (step % 2) * NUDGE_PX, node.renderedY);
        await this.page.evaluate(ONE_FRAME);
        await endStep();
      }
    });
  }

  private async moveTo(point: ViewportPoint): Promise<void> {
    await this.page.mouse.move(point.x, point.y);
    await this.page.evaluate(ONE_FRAME);
    this.point = point;
  }

  /** The Cytoscape `render` events since the page opened; throws when the page exposes no probe. */
  protected async renderCount(): Promise<number> {
    return this.page.evaluate(rendersSoFar);
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }
}
