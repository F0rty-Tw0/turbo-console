/* eslint-disable no-underscore-dangle -- the page and its init scripts expose these exact names on window */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { LayoutEngine, ProbeEdge, ProbeNode, ProbeState } from '../../src/graph/common/graph-probe.type.ts';
import { NODE_HEIGHT, NODE_PADDING_X } from '../../src/graph/common/graph.const.ts';
import { LAYOUT_SETTLE_MS, NEXT_FRAME } from '../common/graph.const.ts';
import type { EdgeStates, NodeStates } from '../common/graph.type.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';
import { lastPositionsPosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

const idOf = (node: ProbeNode): string => node.id;

const nodeStateEntry = (node: ProbeNode): [string, ProbeState] => [node.id, node.state];

const edgeStateEntry = (edge: ProbeEdge): [string, ProbeState] => [`${edge.source}>${edge.target}`, edge.state];

const centreEntry = (node: ProbeNode): [string, Position] => {
  const centre: Position = { x: node.x, y: node.y };

  return [node.id, centre];
};

const nodeNamed = (nodes: ProbeNode[], name: string): ProbeNode | undefined => nodes.find((node): boolean => node.id === name);

/** True when every row sits strictly below the one before it. */
const isDescending = (rows: number[]): boolean => {
  const isBelowPrevious = (row: number, index: number): boolean => {
    if (index === 0) return true;

    const previous = rows[index - 1] ?? Number.POSITIVE_INFINITY;

    return row > previous;
  };

  return rows.every(isBelowPrevious);
};

const hasNodes = (): boolean => {
  const nodes = window.__tcGraphProbe?.nodes() ?? [];

  return nodes.length > 0;
};

/** Reads the drawn graph through the opt-in `window.__tcGraphProbe`, the only reader of it, and checks what it reports. */
export class GraphProbePage {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Nodes are drawn and two frames have passed, so a toolbar reflow from the last input has reached Cytoscape's tap offset. */
  public async waitForNodes(): Promise<void> {
    await this.page.waitForFunction(hasNodes);
    await this.page.evaluate(NEXT_FRAME);
  }

  public async nodes(): Promise<ProbeNode[]> {
    return this.page.evaluate((): ProbeNode[] => window.__tcGraphProbe?.nodes() ?? []);
  }

  public async edges(): Promise<ProbeEdge[]> {
    return this.page.evaluate((): ProbeEdge[] => window.__tcGraphProbe?.edges() ?? []);
  }

  public async zoom(): Promise<number> {
    return this.page.evaluate((): number => window.__tcGraphProbe?.zoom() ?? 0);
  }

  public async pan(): Promise<Position | null> {
    return this.page.evaluate((): Position | null => window.__tcGraphProbe?.pan() ?? null);
  }

  public async edgeColor(): Promise<string> {
    return this.page.evaluate((): string => window.__tcGraphProbe?.edgeColor() ?? '');
  }

  public async selected(): Promise<string | null> {
    return this.page.evaluate((): string | null => window.__tcGraphProbe?.selected() ?? null);
  }

  public async nodeIds(): Promise<string[]> {
    const nodes = await this.nodes();
    const ids = nodes.map(idOf);

    return sortedNames(ids);
  }

  public async expectNoProbe(): Promise<void> {
    const isExposed = await this.page.evaluate((): boolean => window.__tcGraphProbe !== undefined);

    expect(isExposed).toBe(false);
  }

  public async expectNodeCount(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.nodeCount()).toBe(count);
  }

  public async expectEdgeCount(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.edgeCount()).toBe(count);
  }

  public async expectNodeIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.nodeIds()).toEqual(sorted);
  }

  public async expectNodeStates(states: NodeStates): Promise<void> {
    await expect.poll(async (): Promise<NodeStates> => this.nodeStates()).toEqual(states);
  }

  public async expectEdgeStates(states: EdgeStates): Promise<void> {
    await expect.poll(async (): Promise<EdgeStates> => this.edgeStates()).toEqual(states);
  }

  public async expectSelected(name: string | null): Promise<void> {
    await expect.poll(async (): Promise<string | null> => this.selected()).toBe(name);
  }

  /**
   * A layout of either engine is on screen; waits past the page's own ELK timeout, since a fresh worker on a slow runner can miss it (C52).
   * After a fresh open only: across a grouping switch the old mode's engine is still on screen, so use `expectLayoutEngine`.
   */
  public async expectLayoutSettled(): Promise<void> {
    const isSettled = async (): Promise<boolean> => (await this.layoutEngine()) !== null;

    await expect.poll(isSettled, { timeout: LAYOUT_SETTLE_MS }).toBe(true);
  }

  public async expectLayoutEngine(engine: LayoutEngine): Promise<void> {
    await expect.poll(async (): Promise<LayoutEngine | null> => this.layoutEngine(), { timeout: LAYOUT_SETTLE_MS }).toBe(engine);
  }

  /** `ordered` lists names from the top row down: each sits strictly below the one before. */
  public async expectRowsDescending(ordered: string[]): Promise<void> {
    const isTopDown = async (): Promise<boolean> => {
      const nodes = await this.nodes();
      const rows = ordered.map((name): number => nodeNamed(nodes, name)?.y ?? Number.NaN);

      return isDescending(rows);
    };

    await expect.poll(isTopDown).toBe(true);
  }

  /** Every node is 32 px tall; `longer` is wider than `shorter`, and each is wider than the padding alone. */
  public async expectNodeSizes(shorter: string, longer: string): Promise<void> {
    const nodes = await this.nodes();
    const heights = nodes.map((node): number => node.height);
    const expectedHeights = nodes.map((): number => NODE_HEIGHT);
    const shorterWidth = nodeNamed(nodes, shorter)?.width ?? 0;
    const longerWidth = nodeNamed(nodes, longer)?.width ?? 0;

    expect(heights).toEqual(expectedHeights);
    expect(shorterWidth).toBeGreaterThan(NODE_PADDING_X);
    expect(longerWidth).toBeGreaterThan(shorterWidth);
  }

  public async expectNodesAt(positions: Positions): Promise<void> {
    await expect.poll(async (): Promise<Positions> => this.centres()).toEqual(positions);
  }

  public async expectNodesAtPostedPositions(): Promise<void> {
    const posted = await readPosted(this.page);
    const centres = await this.centres();

    expect(lastPositionsPosted(posted)).toEqual(centres);
  }

  public async expectDistinctPositions(): Promise<void> {
    const nodes = await this.nodes();
    const spots = new Set(nodes.map((node): string => `${node.x},${node.y}`));
    const isFinite = nodes.every((node): boolean => Number.isFinite(node.x) && Number.isFinite(node.y));

    expect(isFinite).toBe(true);
    expect(spots.size).toBe(nodes.length);
  }

  private async layoutEngine(): Promise<LayoutEngine | null> {
    return this.page.evaluate((): LayoutEngine | null => window.__tcGraphProbe?.layoutEngine() ?? null);
  }

  private async nodeCount(): Promise<number> {
    const nodes = await this.nodes();

    return nodes.length;
  }

  private async edgeCount(): Promise<number> {
    const edges = await this.edges();

    return edges.length;
  }

  private async nodeStates(): Promise<NodeStates> {
    const nodes = await this.nodes();

    return Object.fromEntries(nodes.map(nodeStateEntry));
  }

  private async edgeStates(): Promise<EdgeStates> {
    const edges = await this.edges();

    return Object.fromEntries(edges.map(edgeStateEntry));
  }

  private async centres(): Promise<Positions> {
    const nodes = await this.nodes();

    return Object.fromEntries(nodes.map(centreEntry));
  }
}
