import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { CLEAR_LONG_TASKS, NEXT_FRAME, ONE_FRAME } from '../common/graph.const.ts';
import type { DragRecord } from '../common/graph.type.ts';
import type { ElementRect, ViewportPoint } from '../common/playwright.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';
import { emptySpotOf, nodeBoxOf } from '../test/utils/graph-geometry.spec.util.ts';
import { lastPositionsPosted } from '../test/utils/graph-posted.spec.util.ts';

const DRAG_STEPS = 8;

const WHEEL_NOTCH = 100;

const DRAG_TOLERANCE = 2;

const idOf = (node: ProbeNode): string => node.id;

const sortedIds = (nodes: ProbeNode[]): string[] => {
  const ids = nodes.map(idOf);

  return ids.sort();
};

/** How far `moved` sits from where the drag should have put the node, per axis, in model units. */
const dragError = (moved: Position | undefined, drag: DragRecord): Position => {
  const x = Math.abs((moved?.x ?? Number.NaN) - (drag.from.x + drag.dx / drag.zoom));
  const y = Math.abs((moved?.y ?? Number.NaN) - (drag.from.y + drag.dy / drag.zoom));
  const error: Position = { x, y };

  return error;
};

/** Mouse and wheel input on the drawn graph, aimed through the probe's rendered node centres. */
export class GraphCanvas {
  public readonly container: Locator;

  private readonly page: Page;
  private drag: DragRecord | null;

  public constructor(page: Page) {
    this.page = page;
    this.drag = null;
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
    const zoom = await this.zoom();
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

  /** Waits `warmUpFrames`, forgets the long tasks so far, then drags the background one step per frame for `panFrames`. */
  public async scriptedPan(warmUpFrames: number, panFrames: number): Promise<void> {
    const spot = await this.emptySpot();

    for (let frame = 0; frame < warmUpFrames; frame += 1) await this.page.evaluate(ONE_FRAME);

    await this.page.evaluate(CLEAR_LONG_TASKS);
    await this.page.mouse.move(spot.x, spot.y);
    await this.page.mouse.down();

    for (let frame = 1; frame <= panFrames; frame += 1) {
      await this.page.mouse.move(spot.x + frame, spot.y + frame);
      await this.page.evaluate(ONE_FRAME);
    }

    await this.page.mouse.up();
  }

  public async expectAllNodesInView(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.outsideCount()).toBe(0);
  }

  public async expectNodeOutOfView(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.outsideCount()).toBeGreaterThan(0);
  }

  /** The last posted positions moved the dragged node by the drag, in model units, and still name every node. */
  public async expectDragPosted(): Promise<void> {
    const drag = this.drag;

    if (drag === null) throw new Error('graph e2e: no node was dragged');

    await this.page.evaluate(NEXT_FRAME);

    const posted = await this.page.evaluate<GraphWebviewMessage[]>('window.__posted');
    const positions: Positions = lastPositionsPosted(posted) ?? {};
    const error = dragError(positions[drag.id], drag);
    const nodes = await this.nodes();

    expect(error.x).toBeLessThanOrEqual(DRAG_TOLERANCE);
    expect(error.y).toBeLessThanOrEqual(DRAG_TOLERANCE);
    expect(Object.keys(positions).sort()).toEqual(sortedIds(nodes));
  }

  private async dragFrom(from: ViewportPoint, dx: number, dy: number): Promise<void> {
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(from.x + dx, from.y + dy, { steps: DRAG_STEPS });
    await this.page.mouse.up();
  }

  private async outsideCount(): Promise<number> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.zoom();
    const nodes = await this.drawn();
    const boxes = nodes.map((node): ElementRect => nodeBoxOf(node, zoom));
    const outside = boxes.filter((box): boolean => !isInside(box, container));

    return outside.length;
  }

  private async emptySpot(): Promise<ViewportPoint> {
    const container = await this.container.evaluate(readRect);
    const zoom = await this.zoom();
    const nodes = await this.drawn();

    return emptySpotOf(container, nodes, zoom);
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

  private async zoom(): Promise<number> {
    return this.page.evaluate<number>('window.__tcGraphProbe.zoom()');
  }

  /** The nodes once any are drawn: a posted state reaches the page, and ELK answers, some tasks later. */
  private async drawn(): Promise<ProbeNode[]> {
    const count = async (): Promise<number> => {
      const nodes = await this.nodes();

      return nodes.length;
    };

    await expect.poll(count).toBeGreaterThan(0);

    return this.nodes();
  }

  private async nodes(): Promise<ProbeNode[]> {
    return this.page.evaluate<ProbeNode[]>('window.__tcGraphProbe.nodes()');
  }
}
