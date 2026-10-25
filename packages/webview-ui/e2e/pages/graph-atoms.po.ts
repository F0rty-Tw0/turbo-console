import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphCanvas } from './graph-canvas.po.ts';
import { GraphProbePage } from './graph-probe.po.ts';
import { GraphTimings } from './graph-timings.po.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { BoxBounds } from '../../src/graph/common/atom-layout.type.ts';
import { ATOM_BOX_PADDING_PX, ATOM_BOX_PREFIX } from '../../src/graph/common/graph-atom.const.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { expectMinUnder } from '../test/utils/graph-min-under.spec.util.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

/** How far, in model px, a side of the drawn box may sit from the computed one: the box also wraps the border of the nodes it holds. */
const BOX_TOLERANCE_PX = 3;

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

/** A node on the shifted side of the umbrella moved by `delta`, any other stayed. */
const expectShift = (id: string, delta: number, isShifted: boolean): void => {
  if (isShifted) expect(delta, `${id} moved`).toBeGreaterThan(0);
  else expect(delta, `${id} stayed`).toBe(0);
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

  /** Expands the group `times` and collapses it `times`, alternating, keeping the probe's `atomToggleMs` after every toggle. */
  public async collectToggleMs(umbrellaId: string, times: number): Promise<void> {
    this.expandSamples = [];
    this.collapseSamples = [];

    for (let count = 0; count < times; count += 1) {
      await this.toggle(umbrellaId);
      this.expandSamples.push(await this.timings.measuredAtomToggleMs());
      await this.toggle(umbrellaId);
      this.collapseSamples.push(await this.timings.measuredAtomToggleMs());
    }
  }

  /** The fastest expand and the fastest collapse were each under `ms`. */
  public expectToggleMinUnder(ms: number): void {
    expectMinUnder('expand-ms', this.expandSamples, ms);
    expectMinUnder('collapse-ms', this.collapseSamples, ms);
  }

  /** Every one of `ids` is drawn for `isDrawn`, or none is. */
  public async expectFilesDrawn(ids: string[], isDrawn: boolean): Promise<void> {
    const sorted = sortedNames(ids);
    const none: string[] = [];
    const expected = isDrawn ? sorted : none;

    await expect.poll(async (): Promise<string[]> => this.drawnOf(ids)).toEqual(expected);
  }

  /** The box `atom:<umbrellaId>` is drawn, every side within `BOX_TOLERANCE_PX` of `bounds`. */
  public async expectBox(umbrellaId: string, bounds: BoxBounds): Promise<void> {
    const errorOf = async (): Promise<number> => this.boxErrorOf(umbrellaId, bounds);

    await expect.poll(errorOf).toBeLessThanOrEqual(BOX_TOLERANCE_PX);
  }

  /** The box `atom:<umbrellaId>` is drawn for `isDrawn`, or gone. */
  public async expectBoxDrawn(umbrellaId: string, isDrawn: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean> => (await this.boxOf(umbrellaId)) !== null).toBe(isDrawn);
  }

  /** The node's border is drawn in `style`. */
  public async expectBorderStyle(id: string, style: string): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.borderStyleOf(id)).toEqual(style);
  }

  /**
   * Every node of `before` outside `ownIds` moved right if it sat right of the collapsed `umbrella`, down if it sat below
   * it, and not at all on an axis where it was neither.
   */
  public async expectNeighboursShifted(before: Positions, ownIds: string[], umbrella: ProbeNode): Promise<void> {
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

      expectShift(id, now.x - was.x, was.x > rightEdge);
      expectShift(id, now.y - was.y, was.y > bottomEdge);
    }
  }

  private async drawnOf(ids: string[]): Promise<string[]> {
    const drawn = await this.probe.nodeIds();

    return sortedNames(drawn.filter((id) => ids.includes(id)));
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
