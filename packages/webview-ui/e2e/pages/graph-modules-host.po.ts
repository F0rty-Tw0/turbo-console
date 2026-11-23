import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphOpenImportMessage } from '../../src/bridge/common/graph-imports.type.ts';
import type {
  GraphPackageModulesMessage,
  GraphScanModulesMessage,
  GraphShowModulesMessage,
  ModulesResult
} from '../../src/bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../src/bridge/common/graph-view-state.type.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import { postReply } from '../test/utils/graph-host-state.spec.util.ts';
import { openImportPosted, readPosted, scanModulesPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The host stand-in's modules side: the `scanModules` asks and `openImport` posts out, `showModules` and `packageModules` in. */
export class GraphModulesHost {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** Posts the host's `showModules` for `name`, as the palette command or a Packages row's menu does. */
  public async sendShowModules(name: string): Promise<void> {
    const message: GraphShowModulesMessage = { type: 'showModules', name };

    await this.post(message);
  }

  /** Answers the newest `scanModules` the page posted, once the page has posted `askCount` of them. */
  public async answerModules(result: ModulesResult, askCount = 1): Promise<void> {
    await expect.poll(async (): Promise<number> => this.askedCount()).toBeGreaterThanOrEqual(askCount);

    const asks = await this.asked();
    const last = asks.at(-1);

    if (last === undefined) throw new Error('graph e2e: the page asked the host to scan no package for modules');

    await this.answerModulesFor(last.packageName, result);
  }

  /** Answers as if the host had been asked about `packageName`, whatever the page asked; returns once the page has handled it. */
  public async answerModulesFor(packageName: string, result: ModulesResult): Promise<void> {
    const reply: GraphPackageModulesMessage = { type: 'packageModules', packageName, result };

    await this.post(reply);
  }

  /**
   * Polls until the page has asked for `packageName`'s modules exactly `times` times, then waits a frame and counts once
   * more, so a duplicate ask that lands after the first match fails the check instead of passing it.
   */
  public async expectModulesAsked(packageName: string, times: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.askedFor(packageName)).toBe(times);
    await this.page.evaluate(NEXT_FRAME);

    const settled = await this.askedFor(packageName);

    expect(settled).toBe(times);
  }

  public async expectOpenImportPosted(messages: GraphOpenImportMessage[]): Promise<void> {
    await expect.poll(async (): Promise<GraphOpenImportMessage[]> => this.openImports()).toEqual(messages);
  }

  /** Polls until the saved modules view holds `expected`'s fields. */
  public async expectModulesSaved(expected: Partial<ModulesViewState>): Promise<void> {
    await expect.poll(async (): Promise<ModulesViewState | null> => this.savedModules()).toMatchObject(expected);
  }

  /** The camera of the saved modules view, `null` before one is saved. */
  public async savedCamera(): Promise<ModulesViewState['camera']> {
    const modules = await this.savedModules();

    return modules?.camera ?? null;
  }

  private async post(message: GraphShowModulesMessage | GraphPackageModulesMessage): Promise<void> {
    const json = JSON.stringify(message);

    await this.page.evaluate(postReply, json);
    await this.page.evaluate(NEXT_FRAME);
  }

  private async asked(): Promise<GraphScanModulesMessage[]> {
    const posted = await readPosted(this.page);

    return scanModulesPosted(posted);
  }

  private async askedCount(): Promise<number> {
    const asks = await this.asked();

    return asks.length;
  }

  private async askedFor(packageName: string): Promise<number> {
    const asks = await this.asked();
    const isFor = (ask: GraphScanModulesMessage): boolean => ask.packageName === packageName;

    return asks.filter(isFor).length;
  }

  private async openImports(): Promise<GraphOpenImportMessage[]> {
    const posted = await readPosted(this.page);

    return openImportPosted(posted);
  }

  private async savedModules(): Promise<ModulesViewState | null> {
    const raw = await this.page.evaluate((): unknown => window.tcState);
    const saved = readGraphViewState(raw);

    return saved?.modules ?? null;
  }
}
