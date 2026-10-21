import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { GraphState } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { GRAPH_DIST_DIR, NEXT_FRAME, SAVED_STATE_MATCHING_PROBE } from '../common/graph.const.ts';
import type { PostedPositions } from '../common/graph.type.ts';
import { postStates } from '../test/utils/graph-host-state.spec.util.ts';
import { layoutDonePosted, openDetailsPosted, positionsPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The VS Code host stand-in: states in, posted messages and worker counts out, the saved view state kept across a reopen. */
export class GraphHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async sendState(state: GraphState): Promise<void> {
    await this.page.evaluate(postStates, [state]);
  }

  public async sendStates(states: GraphState[]): Promise<void> {
    await this.page.evaluate(postStates, states);
  }

  /** Waits for the debounced save to catch up with the page, then reloads it with that saved state, as VS Code does on a restore. */
  public async reopen(): Promise<GraphViewState> {
    await expect.poll(async (): Promise<unknown> => this.page.evaluate<unknown>(SAVED_STATE_MATCHING_PROBE)).not.toBeNull();

    const raw = await this.page.evaluate<unknown>(SAVED_STATE_MATCHING_PROBE);
    const saved = readGraphViewState(raw);

    if (saved === null) throw new Error('graph e2e: the saved view state is not a valid view state');

    await this.seedSavedState(raw);
    await this.page.reload();

    return saved;
  }

  public async seedSavedState(raw: unknown): Promise<void> {
    await this.page.addInitScript({ content: `window.__state = ${JSON.stringify(raw)};` });
  }

  public async expectPosted(messages: GraphWebviewMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphWebviewMessage[]> => this.posted()).toEqual(messages);
  }

  public async expectOpenDetails(packageName: string): Promise<void> {
    const expected = [{ type: 'openDetails', packageName }];

    await expect.poll(async (): Promise<unknown[]> => openDetailsPosted(await this.posted())).toEqual(expected);
  }

  public async expectNoOpenDetails(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    expect(openDetailsPosted(await this.posted())).toEqual([]);
  }

  /** The last `positions` message names the hash and exactly these packages. */
  public async expectPositionsPosted(hash: string, packages: string[]): Promise<void> {
    const copy = [...packages];
    const sorted = copy.sort();
    const expected: PostedPositions = { hash, names: sorted };

    await expect.poll(async (): Promise<PostedPositions> => this.lastPositions()).toEqual(expected);
  }

  /** After the first `layoutDone`: every `positions` message posted so far is for `hash`, and there is one. */
  public async expectPositionsOnlyFor(hash: string): Promise<void> {
    await expect.poll(async (): Promise<number> => layoutDonePosted(await this.posted()).length).toBeGreaterThanOrEqual(1);

    const messages = positionsPosted(await this.posted());
    const hashes = messages.map((message): string => message.hash);

    expect(hashes).toEqual([hash]);
  }

  public async expectNoPositionsPosted(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    expect(positionsPosted(await this.posted())).toEqual([]);
  }

  public async expectLayoutDone(engine: 'elk' | 'fallback'): Promise<void> {
    await expect.poll(async (): Promise<unknown> => layoutDonePosted(await this.posted()).at(-1)?.engine).toBe(engine);
  }

  /** A fallback layout reports `layoutDone` and never posts `positions`. */
  public async expectFallbackPosted(): Promise<void> {
    await this.expectLayoutDone('fallback');

    expect(positionsPosted(await this.posted())).toEqual([]);
  }

  public async expectWorkers(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.page.evaluate<number>('window.__workers')).toBe(count);
  }

  public async expectTerminated(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.page.evaluate<number>('window.__terminated')).toBe(count);
  }

  /** Pushes the ELK time and the `main.js` size to the test's annotations, for the tripwire report. */
  public async recordBundleAndLayout(): Promise<void> {
    await expect.poll(async (): Promise<number> => layoutDonePosted(await this.posted()).length).toBeGreaterThanOrEqual(1);

    const elkMs = layoutDonePosted(await this.posted()).at(-1)?.ms;
    const bundle = await stat(join(GRAPH_DIST_DIR, 'main.js'));

    test.info().annotations.push({ type: 'elk-ms', description: String(elkMs) });
    test.info().annotations.push({ type: 'main-js-bytes', description: String(bundle.size) });
  }

  private async lastPositions(): Promise<PostedPositions> {
    const messages = positionsPosted(await this.posted());
    const last = messages.at(-1);
    const names = Object.keys(last?.positions ?? {});
    const posted: PostedPositions = { hash: last?.hash, names: names.sort() };

    return posted;
  }

  private async posted(): Promise<GraphWebviewMessage[]> {
    return this.page.evaluate<GraphWebviewMessage[]>('window.__posted');
  }
}
