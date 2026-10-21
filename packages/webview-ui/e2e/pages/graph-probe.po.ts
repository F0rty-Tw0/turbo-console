import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { Position, Positions } from '../../src/bridge/common/graph-state.type.ts';
import type { LayoutEngine, ProbeEdge, ProbeNode, ProbeState } from '../../src/graph/common/graph-probe.type.ts';
import { NODE_HEIGHT, NODE_PADDING_X } from '../../src/graph/common/graph.const.ts';
import type { EdgeStates, NodeStates } from '../common/graph.type.ts';
import { lastPositionsPosted } from '../test/utils/graph-posted.spec.util.ts';

const NO_NODES = 'window.__tcGraphProbe?.nodes() ?? []';

const NO_EDGES = 'window.__tcGraphProbe?.edges() ?? []';

const sortedNames = (names: string[]): string[] => {
  const copy = [...names];

  return copy.sort();
};

const idOf = (node: ProbeNode): string => node.id;

const nodeStateEntry = (node: ProbeNode): [string, ProbeState] => [node.id, node.state];

const edgeStateEntry = (edge: ProbeEdge): [string, ProbeState] => [`${edge.source}>${edge.target}`, edge.state];

const centreEntry = (node: ProbeNode): [string, Position] => {
  const centre: Position = { x: node.x, y: node.y };

  return [node.id, centre];
};

const rowOf = (nodes: ProbeNode[], name: string): number => {
  const node = nodes.find((candidate): boolean => candidate.id === name);

  return node?.y ?? Number.NaN;
};

const widthOf = (nodes: ProbeNode[], name: string): number => {
  const node = nodes.find((candidate): boolean => candidate.id === name);

  return node?.width ?? 0;
};

/** True when every row sits strictly below the one before it. */
const isDescending = (rows: number[]): boolean => {
  const isBelowPrevious = (row: number, index: number): boolean => index === 0 || row > (rows[index - 1] ?? Number.POSITIVE_INFINITY);

  return rows.every(isBelowPrevious);
};

/** Reads the drawn graph through the opt-in `window.__tcGraphProbe`, and checks what it reports. */
export class GraphProbePage {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async expectNoProbe(): Promise<void> {
    const probeType = await this.page.evaluate<string>('typeof window.__tcGraphProbe');

    expect(probeType).toBe('undefined');
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
    const selected = async (): Promise<string | null> => this.page.evaluate<string | null>('window.__tcGraphProbe.selected()');

    await expect.poll(selected).toBe(name);
  }

  public async expectLayoutEngine(engine: LayoutEngine): Promise<void> {
    const current = async (): Promise<LayoutEngine | null> =>
      this.page.evaluate<LayoutEngine | null>('window.__tcGraphProbe.layoutEngine()');

    await expect.poll(current).toBe(engine);
  }

  /** `ordered` lists names from the top row down: each sits strictly below the one before. */
  public async expectRowsDescending(ordered: string[]): Promise<void> {
    const isTopDown = async (): Promise<boolean> => {
      const nodes = await this.nodes();
      const rows = ordered.map((name): number => rowOf(nodes, name));

      return isDescending(rows);
    };

    await expect.poll(isTopDown).toBe(true);
  }

  /** Every node is 32 px tall; `longer` is wider than `shorter`, and each is wider than the padding alone. */
  public async expectNodeSizes(shorter: string, longer: string): Promise<void> {
    const nodes = await this.nodes();
    const heights = nodes.map((node): number => node.height);
    const expectedHeights = nodes.map((): number => NODE_HEIGHT);

    expect(heights).toEqual(expectedHeights);
    expect(widthOf(nodes, shorter)).toBeGreaterThan(NODE_PADDING_X);
    expect(widthOf(nodes, longer)).toBeGreaterThan(widthOf(nodes, shorter));
  }

  public async expectNodesAt(positions: Positions): Promise<void> {
    await expect.poll(async (): Promise<Positions> => this.centres()).toEqual(positions);
  }

  public async expectNodesAtPostedPositions(): Promise<void> {
    const posted = await this.page.evaluate<GraphWebviewMessage[]>('window.__posted');
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

  private async nodeCount(): Promise<number> {
    const nodes = await this.nodes();

    return nodes.length;
  }

  private async edgeCount(): Promise<number> {
    const edges = await this.edges();

    return edges.length;
  }

  private async nodeIds(): Promise<string[]> {
    const nodes = await this.nodes();
    const ids = nodes.map(idOf);

    return sortedNames(ids);
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

  private async nodes(): Promise<ProbeNode[]> {
    return this.page.evaluate<ProbeNode[]>(NO_NODES);
  }

  private async edges(): Promise<ProbeEdge[]> {
    return this.page.evaluate<ProbeEdge[]>(NO_EDGES);
  }
}
