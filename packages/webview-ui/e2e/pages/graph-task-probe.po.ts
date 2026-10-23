import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { RunOutline } from '../common/graph.type.ts';
import { sortedNames } from '../test/utils/graph-package.spec.util.ts';
import { withoutSpaces } from '../test/utils/graph-theme.spec.util.ts';

const BOX_PREFIX = 'pkg:';

const isBoxId = (id: string): boolean => id.startsWith(BOX_PREFIX);

const isTaskId = (id: string): boolean => !isBoxId(id);

/** `outline` with its colour as the probe reports it, without spaces. */
const comparableOf = (outline: RunOutline | null): RunOutline | null => {
  if (outline === null) return null;

  const colour = withoutSpaces(outline.colour);
  const comparable: RunOutline = { width: outline.width, colour };

  return comparable;
};

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

  /** The task's outline is `outline` (its colour compared without spaces), or it has none for `null`. */
  public async expectRunOutline(id: string, outline: RunOutline | null): Promise<void> {
    const expected = comparableOf(outline);

    await expect.poll(async (): Promise<RunOutline | null> => this.outlineOf(id)).toEqual(expected);
  }

  private async outlineOf(id: string): Promise<RunOutline | null> {
    const nodes = await this.probe.nodes();
    const node = nodes.find((candidate) => candidate.id === id);

    if (node === undefined || node.outlineWidth === 0) return null;

    const outline: RunOutline = { width: node.outlineWidth, colour: withoutSpaces(node.outlineColor) };

    return outline;
  }

  private async boxIds(): Promise<string[]> {
    const ids = await this.probe.nodeIds();

    return ids.filter(isBoxId);
  }
}
