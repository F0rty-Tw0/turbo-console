import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { ProbeNode } from '../../src/graph/common/graph-probe.type.ts';
import { SCRIPTS_BOX_PREFIX } from '../../src/graph/common/graph-task.const.ts';
import { measuredWidthsOf } from '../test/utils/graph-title-measure.spec.util.ts';

/** Model px a containment check allows for the sub-pixel rounding of compound bounds. */
const CONTAIN_SLACK_PX = 0.5;

const isScriptsBox = (node: ProbeNode): boolean => node.id.startsWith(SCRIPTS_BOX_PREFIX);

/** A drawn box as its id and the title it shows. */
const idAndTextOf = (node: ProbeNode): [string, string] => [node.id, node.text];

const idOf = (node: ProbeNode): string => node.id;

/** Whether `inner`'s rectangle lies inside `outer`'s; a probe width and height leave out the padding. */
const isInside = (inner: ProbeNode, outer: ProbeNode): boolean => {
  const left = inner.x - inner.width / 2 >= outer.x - outer.width / 2 - CONTAIN_SLACK_PX;
  const right = inner.x + inner.width / 2 <= outer.x + outer.width / 2 + CONTAIN_SLACK_PX;
  const top = inner.y - inner.height / 2 >= outer.y - outer.height / 2 - CONTAIN_SLACK_PX;
  const bottom = inner.y + inner.height / 2 <= outer.y + outer.height / 2 + CONTAIN_SLACK_PX;

  return left && right && top && bottom;
};

/** The task canvas compounds read through the probe: the `scripts:` boxes and how the boxes and tasks nest. */
export class GraphTaskBoxes {
  private readonly page: Page;
  private readonly probe: GraphProbePage;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
  }

  /** Every `scripts:` box as its id and title, sorted by id. */
  public async scriptsBoxes(): Promise<[string, string][]> {
    const nodes = await this.probe.nodes();
    const boxes = nodes.filter(isScriptsBox).map(idAndTextOf);

    return boxes.sort(([first], [second]) => first.localeCompare(second));
  }

  /** The drawn `scripts:` boxes are `boxes`, each its id and title, sorted by id. */
  public async expectScriptsBoxes(boxes: [string, string][]): Promise<void> {
    await expect.poll(async (): Promise<[string, string][]> => this.scriptsBoxes()).toEqual(boxes);
  }

  /** The node `innerId` is drawn inside the node `outerId`. */
  public async expectNested(innerId: string, outerId: string): Promise<void> {
    const isNested = async (): Promise<boolean | null> => this.isNested(innerId, outerId);

    await expect.poll(isNested, `${innerId} in ${outerId}`).toBe(true);
  }

  /** The node `innerId` is drawn, but not inside the node `outerId`. */
  public async expectNotNested(innerId: string, outerId: string): Promise<void> {
    const isNested = async (): Promise<boolean | null> => this.isNested(innerId, outerId);

    await expect.poll(isNested, `${innerId} not in ${outerId}`).toBe(false);
  }

  /** Each box in `ids` may draw its whole title: its `text-max-width` beats the rounded-up measure, its width holds it. */
  public async expectTitlesUncut(ids: string[]): Promise<void> {
    const nodes = await this.probe.nodes();
    const boxes = nodes.filter((node) => ids.includes(node.id));
    const titles = boxes.map((box) => box.text);
    const widths = await measuredWidthsOf(this.page, titles);

    const foundIds = boxes.map(idOf);
    const wantedIds = [...ids];

    expect(foundIds.sort()).toEqual(wantedIds.sort());

    for (const box of boxes) {
      const measured = widths.get(box.text) ?? Number.NaN;

      expect(box.textMaxWidth, box.id).toBeGreaterThan(Math.ceil(measured));
      expect(box.width, box.id).toBeGreaterThanOrEqual(measured);
    }
  }

  /** Whether `innerId` lies inside `outerId`; `null` while either is not drawn. */
  private async isNested(innerId: string, outerId: string): Promise<boolean | null> {
    const nodes = await this.probe.nodes();
    const inner = nodes.find((node) => node.id === innerId);
    const outer = nodes.find((node) => node.id === outerId);

    if (inner === undefined || outer === undefined) return null;

    return isInside(inner, outer);
  }
}
