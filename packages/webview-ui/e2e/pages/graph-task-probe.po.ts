import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';

const BOX_PREFIX = 'pkg:';

const isBoxId = (id: string): boolean => id.startsWith(BOX_PREFIX);

const isTaskId = (id: string): boolean => !isBoxId(id);

/** The drawn task graph read through the probe: task node ids and the `pkg:` package compounds around them. */
export class GraphTaskProbe {
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.probe = new GraphProbePage(page);
  }

  /** The probe's node ids without the `pkg:` compounds, sorted. */
  public async taskIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isTaskId);
  }

  public async expectTaskIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.taskIds()).toEqual(sorted);
  }

  /** The `pkg:` compound ids, as `pkg:<package name>`. */
  public async expectBoxIds(ids: string[]): Promise<void> {
    const sorted = sortedNames(ids);

    await expect.poll(async (): Promise<string[]> => this.boxIds()).toEqual(sorted);
  }

  private async boxIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isBoxId);
  }
}
