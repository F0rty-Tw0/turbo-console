import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { BoxBounds } from '../../src/graph/common/atom-layout.type.ts';
import { ATOM_BOX_PADDING_PX, ATOM_BOX_PREFIX } from '../../src/graph/common/graph-atom.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import type { NodeSize } from '../../src/graph/common/node-size.type.ts';
import { drawnIdsOf } from '../test/utils/graph-atom-nodes.spec.util.ts';
import { expectMinUnder } from '../test/utils/graph-min-under.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

/** How far, in model px, a side of the drawn box may sit from the computed one: the box also wraps the border of the nodes it holds. */
const BOX_TOLERANCE_PX = 3;

/** Playwright's default `expect` timeout. */
const EXPECT_TIMEOUT_MS = 5000;

const idOf = (node: ProbeNode): string => node.id;

/** The node's rect with its padding, as `boundingBox({ includeLabels: false })` reports a box. */
const outerBoundsOf = (node: ProbeNode): BoxBounds => {
  const width = node.width + 2 * ATOM_BOX_PADDING_PX;
  const height = node.height + 2 * ATOM_BOX_PADDING_PX;
  const bounds: BoxBounds = { x: node.x - width / 2, y: node.y - height / 2, width, height };

  return bounds;
};

/** A neighbour node as it sat in `was` and as it is drawn now. */
type Shift = {
  readonly id: string;
  readonly was: Position | undefined;
  readonly now: ProbeNode | undefined;
};

/** How far a node at `at` moves on an axis: `extra` when it sat past `edge`, not at all when it did not. */
const shiftPast = (at: number, edge: number, extra: number): number => {
  if (at > edge) return extra;

  return 0;
};

/** The node moved by `expected` on an axis, to the model's precision. */
const expectShift = (id: string, moved: number, expected: number): void => {
  expect(moved, `${id} moved by ${expected}`).toBeCloseTo(expected, 1);
};

/** The Atomizer groups of the task graph: toggling one with a double tap, its file nodes and box, and how long a toggle took. */
export class GraphAtoms {
  private readonly canvas: GraphCanvas;
  private readonly probe: GraphProbePage;
  private readonly timings: GraphTimings;
  private expandSamples: number[] = [];
  private collapseSamples: number[] = [];

  public constructor(page: Page) {
    this.canvas = new GraphCanvas(page);
    this.probe = new GraphProbePage(page);
    this.timings = new GraphTimings(page);
  }

  /** The probe's reading of the node `id`; fails the test when it is not drawn. */
  public async nodeOf(id: string): Promise<ProbeNode> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => idOf(candidate) === id);

    if (node === undefined) throw new Error(`graph e2e: ${id} is not drawn`);

    return node;
  }

  /** Double taps the node: the umbrella, its box or one of its files. */
  public async toggle(id: string): Promise<void> {
    await this.canvas.doubleTapNode(id);
  }

  /**
   * Expands the group `times` and collapses it `times`, alternating, keeping the probe's `atomToggleMs` after every toggle.
   * Each toggle must have drawn or removed the box first, so a dropped tap fails instead of keeping the previous timing.
   */
  public async collectToggleMs(umbrellaId: string, times: number): Promise<void> {
    this.expandSamples = [];
    this.collapseSamples = [];

    for (let count = 0; count < times; count += 1) {
      await this.toggle(umbrellaId);
      await this.expectBoxDrawn(umbrellaId, true);
      this.expandSamples.push(await this.timings.measuredAtomToggleMs());
      await this.toggle(umbrellaId);
      await this.expectBoxDrawn(umbrellaId, false);
      this.collapseSamples.push(await this.timings.measuredAtomToggleMs());
    }
  }

  /** The fastest of all the expands and the fastest of all the collapses were each under `ms`. */
  public expectToggleMinUnder(ms: number): void {
    expectMinUnder('expand-ms', this.expandSamples, ms);
    expectMinUnder('collapse-ms', this.collapseSamples, ms);
  }

  /** Every one of `ids` is drawn for `isDrawn`, or none is. */
  public async expectFilesDrawn(ids: string[], isDrawn: boolean): Promise<void> {
    const sorted = sortedNames(ids);
    const none: string[] = [];
    const expected = isDrawn ? sorted : none;

    await expect.poll(async (): Promise<string[]> => drawnIdsOf(this.probe, ids)).toEqual(expected);
  }

  /** The box `atom:<umbrellaId>` is drawn, every side within `BOX_TOLERANCE_PX` of `bounds`. */
  public async expectBox(umbrellaId: string, bounds: BoxBounds): Promise<void> {
    const errorOf = async (): Promise<number> => this.boxErrorOf(umbrellaId, bounds);

    await expect.poll(errorOf).toBeLessThanOrEqual(BOX_TOLERANCE_PX);
  }

  /** The box `atom:<umbrellaId>` is drawn for `isDrawn`, or gone; `timeoutMs` replaces the 5 s of the config for a graph slow to redraw. */
  public async expectBoxDrawn(umbrellaId: string, isDrawn: boolean, timeoutMs = EXPECT_TIMEOUT_MS): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isBoxDrawn(umbrellaId), { timeout: timeoutMs }).toBe(isDrawn);
  }

  /** The canvas container's native tooltip reads `title`, or it has none for `null`. */
  public async expectCanvasTitle(title: string | null): Promise<void> {
    const assertion = expect(this.canvas.container);

    if (title === null) return assertion.not.toHaveAttribute('title');

    return assertion.toHaveAttribute('title', title);
  }

  /** The node's border is drawn in `style`. */
  public async expectBorderStyle(id: string, style: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.borderStyleOf(id)).toEqual(style);
  }

  /**
   * Every node of `before` outside `ownIds` moved right by `extra.width` if it sat right of the collapsed `umbrella`, down by
   * `extra.height` if it sat below it, and not at all on an axis where it was neither.
   */
  public async expectNeighboursShifted(before: Positions, ownIds: string[], umbrella: ProbeNode, extra: NodeSize): Promise<void> {
    const nodes = await this.probe.nodes();
    const rightEdge = umbrella.x + umbrella.width / 2;
    const bottomEdge = umbrella.y + umbrella.height / 2;
    const neighbourIds = Object.keys(before).filter((id) => !ownIds.includes(id));
    const shiftOf = (id: string): Shift => {
      const was = before[id];
      const now = nodes.find((node) => node.id === id);
      const shift: Shift = { id, was, now };

      return shift;
    };
    const shifts = neighbourIds.map(shiftOf);

    for (const { id, was, now } of shifts) {
      expect(now, `${id} is still drawn`).toBeDefined();

      if (was === undefined || now === undefined) continue;

      expectShift(id, now.x - was.x, shiftPast(was.x, rightEdge, extra.width));
      expectShift(id, now.y - was.y, shiftPast(was.y, bottomEdge, extra.height));
    }
  }

  private async isBoxDrawn(umbrellaId: string): Promise<boolean> {
    const box = await this.boxOf(umbrellaId);

    return box !== null;
  }

  private async boxOf(umbrellaId: string): Promise<BoxBounds | null> {
    const boxId = `${ATOM_BOX_PREFIX}${umbrellaId}`;
    const nodes = await this.probe.nodes();
    const box = nodes.find((node) => idOf(node) === boxId);

    if (box === undefined) return null;

    const bounds = outerBoundsOf(box);

    return bounds;
  }

  /** The largest side error of the drawn box against `bounds`; `Infinity` while it is not drawn. */
  private async boxErrorOf(umbrellaId: string, bounds: BoxBounds): Promise<number> {
    const drawn = await this.boxOf(umbrellaId);

    if (drawn === null) return Number.POSITIVE_INFINITY;

    const right = drawn.x + drawn.width - (bounds.x + bounds.width);
    const bottom = drawn.y + drawn.height - (bounds.y + bounds.height);
    const errors = [drawn.x - bounds.x, drawn.y - bounds.y, right, bottom];

    const sizes = errors.map(Math.abs);

    return Math.max(...sizes);
  }

  private async borderStyleOf(id: string): Promise<string | null> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => idOf(candidate) === id);

    return node?.borderStyle ?? null;
  }
}
