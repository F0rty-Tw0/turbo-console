import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeEdge, ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { CpuSteps } from '../common/graph.type.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { edgeMidpointOf, emptySpotOf } from '../test/utils/graph-geometry.spec.util.ts';
import { recordHoverCpu } from '../test/utils/graph-hover-cpu.spec.util.ts';
import { rendersSoFar } from '../test/utils/graph-quiet-canvas.spec.util.ts';
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
  private readonly probe: GraphProbePage;
  private hoverCpu: CpuSteps | null;
  private hoverRenders: number | null;
  private point: ViewportPoint | null;

  public constructor(page: Page) {
    this.page = page;
    this.hoverCpu = null;
    this.hoverRenders = null;
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

  /** Moves the pointer onto the middle of the `source` to `target` link and lets a frame draw. */
  public async overLink(source: string, target: string): Promise<void> {
    await this.probe.waitForNodes();

    const nodes = await this.probe.nodes();
    const midpoint = edgeMidpointOf(nodes, source, target);

    await this.moveTo(midpoint);
  }

  /** Moves the pointer to an empty spot of the canvas, off every node and link, and lets a frame draw. */
  public async overBackground(): Promise<void> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.probe.nodes();
    const edges = await this.probe.edges();
    const spot: ViewportPoint = emptySpotOf(container, nodes, edges, zoom);

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
   * Rests the pointer on node `id`, then nudges it 1 px per step for `spanMs / 16` steps (3000 gives 188), keeping the
   * main-thread CPU each step took. A step is a mouse move plus one `requestAnimationFrame` round trip, about two
   * frames, so the run lasts about twice `spanMs` of wall time (188 steps take about 6 s).
   * The pointer keeps moving, so the flow overlay never reaches its idle stop and draws throughout.
   * Also counts the Cytoscape renders those steps caused; the hover-enter paint happens in `overNode`, before either measure starts.
   */
  public async hoverFlowCpu(id: string, spanMs: number): Promise<void> {
    await this.overNode(id);

    const node = await this.nodeOf(id);
    const steps = Math.ceil(spanMs / STEP_SPAN_MS);
    const rendersBefore = await this.renderCount();

    this.hoverCpu = await cpuStepsOf(this.page, async (endStep): Promise<void> => {
      for (let step = 1; step <= steps; step += 1) {
        await this.page.mouse.move(node.renderedX + (step % 2) * NUDGE_PX, node.renderedY);
        await this.page.evaluate(ONE_FRAME);
        await endStep();
      }
    });
    this.hoverRenders = (await this.renderCount()) - rendersBefore;
  }

  /** The main-thread CPU of the last `hoverFlowCpu`; throws when none ran. */
  public measuredHoverCpu(): CpuSteps {
    const hover = this.hoverCpu;

    if (hover === null) throw new Error('graph e2e: no hover-flow run was measured');

    return hover;
  }

  /** The Cytoscape renders during the last `hoverFlowCpu`; throws when none ran. */
  public measuredHoverRenders(): number {
    const renders = this.hoverRenders;

    if (renders === null) throw new Error('graph e2e: no hover-flow run was measured');

    return renders;
  }

  /** The last `hoverFlowCpu` used a measured, non-zero total under `totalMs` of main-thread CPU with no step over `stepMs`; both are recorded and printed before the asserts, so a failing run logs them too. */
  public expectHoverCpuUnder(totalMs: number, stepMs: number): void {
    const hover = this.measuredHoverCpu();

    recordHoverCpu(test.info(), hover, this.measuredHoverRenders(), { totalMs, stepMs });
    expect(hover.totalMs).toBeGreaterThan(0);
    expect(hover.totalMs).toBeLessThan(totalMs);
    expect(hover.maxStepMs).toBeLessThan(stepMs);
  }

  /** The last `hoverFlowCpu` made Cytoscape render at most `limit` times: the flow stayed on its overlay. */
  public expectHoverRendersAtMost(limit: number): void {
    expect(this.measuredHoverRenders()).toBeLessThanOrEqual(limit);
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
