import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { ONE_FRAME } from '../common/graph.const.ts';
import type { CpuSteps, DragRecord } from '../common/graph.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { dragError, isWithinTolerance } from '../test/utils/graph-drag-error.spec.util.ts';
import { emptySpotOf, nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { lastPositionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';
import { dragPerFrame } from '../test/utils/graph-scripted-pan.spec.util.ts';
import { cpuStepsOf, recordPanCpu } from '../test/utils/graph-thread-time.spec.util.ts';

const DRAG_STEPS = 8;

const WHEEL_NOTCH = 100;

/** Mouse and wheel input on the drawn graph, aimed through the probe's rendered node centres. */
export class GraphCanvas {
  public readonly container: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private drag: DragRecord | null;
  private panCpu: CpuSteps | null;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.drag = null;
    this.panCpu = null;
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
  }

  public async tapNode(id: string): Promise<void> {
    const node = await this.nodeOf(id);

    await this.page.mouse.click(node.renderedX, node.renderedY);
  }

  public async doubleTapNode(id: string): Promise<void> {
    const node = await this.nodeOf(id);

    await this.page.mouse.dblclick(node.renderedX, node.renderedY);
  }

  public async tapBackground(): Promise<void> {
    const spot = await this.emptySpot();

    await this.page.mouse.click(spot.x, spot.y);
  }

  public async dragNode(id: string, dx: number, dy: number): Promise<void> {
    const node = await this.nodeOf(id);
    const zoom = await this.probe.zoom();
    const from: Position = { x: node.x, y: node.y };
    const grab: ViewportPoint = { x: node.renderedX, y: node.renderedY };

    this.drag = { id, from, dx, dy, zoom };
    await this.dragFrom(grab, dx, dy);
  }

  /**
   * Wheels `deltaY` over the container centre, one 100 px notch at a time: Cytoscape reads a lone big delta as a
   * clamped first sample and zooms a few percent, so a notch per event is how a real wheel reaches it.
   */
  public async zoomBy(deltaY: number): Promise<void> {
    await this.drawn();

    const centre = await this.centre();
    const notches = Math.abs(deltaY) / WHEEL_NOTCH;
    const notch = Math.sign(deltaY) * WHEEL_NOTCH;

    await this.page.mouse.move(centre.x, centre.y);

    for (let count = 0; count < notches; count += 1) await this.page.mouse.wheel(0, notch);
  }

  public async panBy(dx: number, dy: number): Promise<void> {
    const spot = await this.emptySpot();

    await this.dragFrom(spot, dx, dy);
  }

  /**
   * Waits `warmUpFrames`, then drags one step per frame for `panFrames` from `spot`, or from an empty spot of the flat
   * graph, keeping the main-thread CPU each step took. `afterWarmUp` runs inside the CPU measurement, before the first
   * drag step, so a caller can mark the pan window after the CDP session is set up.
   */
  public async scriptedPan(
    warmUpFrames: number,
    panFrames: number,
    spot?: ViewportPoint,
    afterWarmUp?: () => Promise<void>
  ): Promise<void> {
    const start = spot ?? (await this.emptySpot());

    for (let frame = 0; frame < warmUpFrames; frame += 1) await this.page.evaluate(ONE_FRAME);

    this.panCpu = await cpuStepsOf(this.page, async (endStep): Promise<void> => {
      await afterWarmUp?.();
      await dragPerFrame(this.page, start, panFrames, endStep);
    });
  }

  /** The main-thread CPU of the last scripted pan; throws when none ran. */
  public measuredPanCpu(): CpuSteps {
    const pan = this.panCpu;

    if (pan === null) throw new Error('graph e2e: no scripted pan ran');

    return pan;
  }

  /** The last scripted pan used a measured, non-zero total under `totalMs` of main-thread CPU with no step over `stepMs`; both are recorded as annotations and printed before the asserts, so a failing run logs them too. */
  public expectPanCpuUnder(totalMs: number, stepMs: number): void {
    const pan = this.measuredPanCpu();

    recordPanCpu(test.info(), pan, totalMs, stepMs);
    expect(pan.totalMs).toBeGreaterThan(0);
    expect(pan.totalMs).toBeLessThan(totalMs);
    expect(pan.maxStepMs).toBeLessThan(stepMs);
  }

  public async expectAllNodesInView(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.outsideCount()).toBe(0);
  }

  public async expectNodeOutOfView(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.outsideCount()).toBeGreaterThan(0);
  }

  /** Polls until the last posted positions moved the dragged node by the drag, in model units; they still name every node. */
  public async expectDragPosted(): Promise<void> {
    const drag = this.drag;

    if (drag === null) throw new Error('graph e2e: no node was dragged');

    const message = 'the last posted positions move the dragged node by the drag';

    await expect.poll(async (): Promise<boolean> => this.isDragPosted(drag), { message }).toBe(true);

    const positions = await this.lastPosted();
    const names = Object.keys(positions).sort();
    const ids = await this.probe.nodeIds();

    expect(names).toEqual(ids);
  }

  private async dragFrom(from: ViewportPoint, dx: number, dy: number): Promise<void> {
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(from.x + dx, from.y + dy, { steps: DRAG_STEPS });
    await this.page.mouse.up();
  }

  private async isDragPosted(drag: DragRecord): Promise<boolean> {
    const positions = await this.lastPosted();
    const error = dragError(positions[drag.id], drag);

    return isWithinTolerance(error);
  }

  private async lastPosted(): Promise<Positions> {
    const posted = await readPosted(this.page);

    return lastPositionsPosted(posted) ?? {};
  }

  private async outsideCount(): Promise<number> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.drawn();
    const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
    const outside = boxes.filter((box): boolean => !isInside(box, container));

    return outside.length;
  }

  private async emptySpot(): Promise<ViewportPoint> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();
    const nodes = await this.drawn();
    const edges = await this.probe.edges();

    return emptySpotOf(container, nodes, edges, zoom);
  }

  private async centre(): Promise<ViewportPoint> {
    const rect = await this.container.evaluate(readRect);
    const centre: ViewportPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    return centre;
  }

  private async nodeOf(id: string): Promise<ProbeNode> {
    const nodes = await this.drawn();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    return node;
  }

  /** The nodes once any are drawn: a posted state reaches the page, and ELK answers, some tasks later. */
  private async drawn(): Promise<ProbeNode[]> {
    await this.probe.waitForNodes();

    return this.probe.nodes();
  }
}
