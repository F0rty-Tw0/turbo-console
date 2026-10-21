import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphState } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphSmokeOptions } from '../common/graph-smoke.type.ts';
import { HOST_API_STUB, SHELL_ORIGIN, SHELL_URL, VIOLATION_RECORDER } from '../common/shell.const.ts';
import { distMock } from '../test/mocks/dist.mock.ts';

const PROBE_FLAG = 'window.__tcGraphProbeWanted = true;';

const NODE_COUNT = 'window.__tcGraphProbe?.nodes().length ?? -1';

const EDGE_COUNT = 'window.__tcGraphProbe?.edges().length ?? -1';

const DISTINCT_CENTRES = `(() => {
  const nodes = window.__tcGraphProbe.nodes();
  const centres = new Set(nodes.map((node) => node.x + ',' + node.y));

  return centres.size === nodes.length && nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
})()`;

/** The posted `positions` hash and package count, and the `layoutDone` engine; `null` before `layoutDone` arrives. */
const LAYOUT_POSTED = `(() => {
  const done = window.__posted.find((message) => message.type === 'layoutDone');
  const positions = window.__posted.find((message) => message.type === 'positions');

  if (done === undefined) return null;

  return [positions?.hash ?? null, Object.keys(positions?.positions ?? {}).length, done.engine];
})()`;

const postState = (state: GraphState): void => {
  const message = { type: 'state', state };

  window.postMessage(message, '*');
};

/** The real graph page under the graph CSP, driven by posted states and read through the opt-in probe. */
export class GraphSmokePage {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async goto(options: GraphSmokeOptions): Promise<void> {
    await this.page.addInitScript({ content: VIOLATION_RECORDER });
    await this.page.addInitScript({ content: HOST_API_STUB });

    if (options.probe) await this.page.addInitScript({ content: PROBE_FLAG });

    await this.page.route(`${SHELL_ORIGIN}/**`, distMock());
    await this.page.goto(SHELL_URL);
  }

  public async postState(state: GraphState): Promise<void> {
    await this.page.evaluate(postState, state);
  }

  public async expectNodeCount(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.page.evaluate<number>(NODE_COUNT)).toBe(count);
  }

  public async expectEdgeCount(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.page.evaluate<number>(EDGE_COUNT)).toBe(count);
  }

  public async expectDistinctCentres(): Promise<void> {
    const isDistinct = await this.page.evaluate<boolean>(DISTINCT_CENTRES);

    expect(isDistinct).toBe(true);
  }

  public async expectLayoutPosted(hash: string, packageCount: number): Promise<void> {
    const expected = [hash, packageCount, 'elk'];

    await expect.poll(async (): Promise<unknown> => this.page.evaluate<unknown>(LAYOUT_POSTED)).toStrictEqual(expected);
  }

  public async expectNoViolations(): Promise<void> {
    const violations = await this.page.evaluate<string[]>('window.__violations');

    expect(violations).toEqual([]);
  }

  public async expectNoProbe(): Promise<void> {
    const probeType = await this.page.evaluate<string>('typeof window.__tcGraphProbe');

    expect(probeType).toBe('undefined');
  }
}
