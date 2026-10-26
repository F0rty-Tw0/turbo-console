import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { GRAPH_LABEL } from '../../src/graph/common/graph.const.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ViewportPoint } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { edgeMidpointOf, emptySpotOf } from '../test/utils/graph-geometry.spec.util.ts';

/** Half the side, in px, of the square around the pointer that a press must leave unchanged. */
const PRESS_HALF_PX = 60;

/** Where the pointer is not over any node, so the first move cannot be read as a return. */
const OUTSIDE: ViewportPoint = { x: 1, y: 1 };

const cursorAt = ({ x, y }: ViewportPoint): string => {
  const element = document.elementFromPoint(x, y);

  if (element === null) return '';

  return getComputedStyle(element).cursor;
};

/** A page area in CSS pixels, as `page.screenshot` clips it. */
type ScreenClip = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** The pointer on the drawn graph: where it rests, the cursor the page shows there, and what a press there draws. */
export class GraphPointer {
  private readonly container: Locator;
  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private pointer: ViewportPoint;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.pointer = OUTSIDE;
  }

  public async moveToNode(id: string): Promise<void> {
    const nodes = await this.drawn();
    const node = nodes.find((candidate): boolean => candidate.id === id);

    if (node === undefined) throw new Error(`graph e2e: no node ${id} is drawn`);

    await this.moveTo({ x: node.renderedX, y: node.renderedY });
  }

  /** The middle of the link between the two rendered centres. */
  public async moveToLink(source: string, target: string): Promise<void> {
    const nodes = await this.drawn();

    await this.moveTo(edgeMidpointOf(nodes, source, target));
  }

  public async moveToEmpty(): Promise<void> {
    const nodes = await this.drawn();
    const edges = await this.probe.edges();
    const container = await this.container.evaluate(readRect);
    const zoom = await this.probe.zoom();

    await this.moveTo(emptySpotOf(container, nodes, edges, zoom));
  }

  /** Out of the canvas, over the page's top left corner. */
  public async moveOutside(): Promise<void> {
    await this.moveTo(OUTSIDE);
  }

  /** The element at the pointer shows `cursor`. */
  public async expectCursor(cursor: string): Promise<void> {
    const point = this.pointer;

    await expect.poll(async (): Promise<string> => this.page.evaluate(cursorAt, point)).toBe(cursor);
  }

  /** The graph container itself shows `cursor`. */
  public async expectContainerCursor(cursor: string): Promise<void> {
    await expect(this.container).toHaveCSS('cursor', cursor);
  }

  public async expectContainerFocused(): Promise<void> {
    await expect(this.container).toBeFocused();
  }

  /** The graph container draws its focus outline, or draws none. */
  public async expectContainerRing(isRing: boolean): Promise<void> {
    const style = isRing ? 'solid' : 'none';

    await expect(this.container).toHaveCSS('outline-style', style);
  }

  /** Pressing the mouse at the pointer changes no pixel within 60 px of it. */
  public async expectPressDrawsNothing(): Promise<void> {
    const clip = this.clipAround();

    await this.page.evaluate(NEXT_FRAME);

    const before = await this.page.screenshot({ clip });

    await this.page.mouse.down();
    await this.page.evaluate(NEXT_FRAME);

    const during = await this.page.screenshot({ clip });

    await this.page.mouse.up();
    expect(during.equals(before)).toBe(true);
  }

  private async moveTo(point: ViewportPoint): Promise<void> {
    await this.page.mouse.move(point.x, point.y);
    this.pointer = point;
  }

  private async drawn(): Promise<ProbeNode[]> {
    await this.probe.waitForNodes();

    return this.probe.nodes();
  }

  private clipAround(): ScreenClip {
    const size = this.page.viewportSize();
    const left = Math.max(0, this.pointer.x - PRESS_HALF_PX);
    const top = Math.max(0, this.pointer.y - PRESS_HALF_PX);
    const right = Math.min(size?.width ?? 0, this.pointer.x + PRESS_HALF_PX);
    const bottom = Math.min(size?.height ?? 0, this.pointer.y + PRESS_HALF_PX);
    const clip: ScreenClip = { x: left, y: top, width: right - left, height: bottom - top };

    return clip;
  }
}
