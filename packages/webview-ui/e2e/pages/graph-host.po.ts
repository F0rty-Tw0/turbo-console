/* eslint-disable no-underscore-dangle -- the page and its init scripts expose these exact names on window */

import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { GraphWebviewMessage } from '../../src/bridge/common/graph-message.type.ts';
import type { GraphState } from '../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { GRAPH_DIST_DIR, NEXT_FRAME } from '../common/graph.const.ts';
import type { LayoutDoneMessage, OpenDetailsMessage, PostedPositions } from '../common/graph.type.ts';
import { postStates } from '../test/utils/graph-host-state.spec.util.ts';
import {
  hasLayoutDone,
  lastPostedNames,
  layoutDonePosted,
  openDetailsPosted,
  positionsPosted,
  readPosted
} from '../test/utils/graph-posted.spec.util.ts';
import { savedStateScript } from '../test/utils/graph-saved-state.spec.util.ts';

type LayoutEngineName = LayoutDoneMessage['engine'];

const engineOf = (message: LayoutDoneMessage): LayoutEngineName => message.engine;

/** The VS Code host stand-in: states in, posted messages and worker counts out, the saved view state kept across a reopen. */
export class GraphHost {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  public async sendState(state: GraphState): Promise<void> {
    await this.sendStates([state]);
  }

  public async sendStates(states: GraphState[]): Promise<void> {
    const json = JSON.stringify(states);

    await this.page.evaluate(postStates, json);
  }

  /** Reloads the page with the view state it saved, as VS Code does on a restore, and hands that state back. */
  public async reopen(): Promise<GraphViewState> {
    const raw = await this.savedState();
    const saved = readGraphViewState(raw);

    if (saved === null) throw new Error('graph e2e: the saved view state is not a valid view state');

    await this.page.addInitScript({ content: savedStateScript(raw) });
    await this.page.reload();

    return saved;
  }

  /** The debounced save has caught up with the page: the saved zoom, pan and selection are the probe's. */
  public async expectViewSaved(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isViewSaved()).toBe(true);
  }

  public async expectPosted(messages: GraphWebviewMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphWebviewMessage[]> => readPosted(this.page)).toEqual(messages);
  }

  public async expectOpenDetails(packageName: string): Promise<void> {
    const expected = [{ type: 'openDetails', packageName }];

    await expect.poll(async (): Promise<OpenDetailsMessage[]> => this.openDetailsMessages()).toEqual(expected);
  }

  public async expectNoOpenDetails(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const messages = await this.openDetailsMessages();

    expect(messages).toEqual([]);
  }

  /** The last `positions` message names the hash and, as own keys read in the page, exactly these packages. */
  public async expectPositionsPosted(hash: string, packages: string[]): Promise<void> {
    const copy = [...packages];
    const sorted = copy.sort();
    const expected: PostedPositions = { hash, names: sorted };

    await expect.poll(async (): Promise<PostedPositions> => this.lastPositions()).toEqual(expected);
  }

  /** After the first `layoutDone`: every `positions` message posted so far is for `hash`, and there is one. */
  public async expectPositionsOnlyFor(hash: string): Promise<void> {
    await this.page.waitForFunction(hasLayoutDone);

    const posted = await readPosted(this.page);
    const hashes = positionsPosted(posted).map((message): string => message.hash);

    expect(hashes).toEqual([hash]);
  }

  public async expectNoPositionsPosted(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const posted = await readPosted(this.page);

    expect(positionsPosted(posted)).toEqual([]);
  }

  public async expectLayoutDone(engine: LayoutEngineName): Promise<void> {
    await expect.poll(async (): Promise<LayoutEngineName | undefined> => this.lastLayoutEngine()).toBe(engine);
  }

  /** Every `layoutDone` so far, by engine, in order. */
  public async expectLayoutDones(engines: LayoutEngineName[]): Promise<void> {
    await expect.poll(async (): Promise<LayoutEngineName[]> => this.layoutEngines()).toEqual(engines);
  }

  /** A fallback layout reports `layoutDone` and never posts `positions`. */
  public async expectFallbackPosted(): Promise<void> {
    await this.expectLayoutDone('fallback');

    const posted = await readPosted(this.page);

    expect(positionsPosted(posted)).toEqual([]);
  }

  public async expectWorkers(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.workerCount()).toBe(count);
  }

  public async expectTerminated(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.terminatedCount()).toBe(count);
  }

  /** The real workers have sent the page at least `count` messages: ELK answers its register and layout commands. */
  public async expectWorkerMessages(count: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.workerMessageCount()).toBeGreaterThanOrEqual(count);
  }

  /** Waits for the first `layoutDone`, then pushes the ELK time and the `main.js` size to the test's annotations. */
  public async recordBundleAndLayout(): Promise<void> {
    await this.page.waitForFunction(hasLayoutDone);

    const posted = await readPosted(this.page);
    const elkMs = layoutDonePosted(posted).at(-1)?.ms;
    const bundle = await stat(join(GRAPH_DIST_DIR, 'main.js'));

    test.info().annotations.push({ type: 'elk-ms', description: String(elkMs) });
    test.info().annotations.push({ type: 'main-js-bytes', description: String(bundle.size) });
  }

  private async isViewSaved(): Promise<boolean> {
    const raw = await this.savedState();
    const saved = readGraphViewState(raw);
    const zoom = await this.probe.zoom();
    const pan = await this.probe.pan();
    const selected = await this.probe.selected();

    if (saved === null || pan === null) return false;

    const isSamePan = saved.pan.x === pan.x && saved.pan.y === pan.y;

    return saved.zoom === zoom && isSamePan && saved.selected === selected;
  }

  private async workerCount(): Promise<number> {
    return this.page.evaluate((): number => window.__workers ?? 0);
  }

  private async terminatedCount(): Promise<number> {
    return this.page.evaluate((): number => window.__terminated ?? 0);
  }

  private async workerMessageCount(): Promise<number> {
    return this.page.evaluate((): number => window.__workerMessages ?? 0);
  }

  private async savedState(): Promise<unknown> {
    return this.page.evaluate((): unknown => window.__state);
  }

  private async openDetailsMessages(): Promise<OpenDetailsMessage[]> {
    const posted = await readPosted(this.page);

    return openDetailsPosted(posted);
  }

  private async layoutEngines(): Promise<LayoutEngineName[]> {
    const posted = await readPosted(this.page);

    return layoutDonePosted(posted).map(engineOf);
  }

  private async lastLayoutEngine(): Promise<LayoutEngineName | undefined> {
    const engines = await this.layoutEngines();

    return engines.at(-1);
  }

  private async lastPositions(): Promise<PostedPositions> {
    const posted = await readPosted(this.page);
    const last = positionsPosted(posted).at(-1);
    const names = await this.page.evaluate(lastPostedNames);
    const lastPosted: PostedPositions = { hash: last?.hash, names: names.sort() };

    return lastPosted;
  }
}
