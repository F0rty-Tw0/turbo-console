import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { PanelSide } from '../../src/graph/common/graph-page.type.ts';
import { RESIZE_LABELS } from '../../src/graph/common/graph.const.ts';

/** A sash's `aria-valuenow`, `aria-valuemax` and `aria-valuemin`; a field left out is not checked. */
type SashValue = {
  readonly now?: number;
  readonly max?: number;
  readonly min?: number;
};

/** An expected value, `undefined` when not checked, and the attribute that holds it. */
type ValueCheck = [number | undefined, string];

/** The Controls and Details sashes and the widths of the panels they resize. */
export class GraphSashes {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public sash(side: PanelSide): Locator {
    return this.page.getByRole('separator', { name: RESIZE_LABELS[side], exact: true });
  }

  /** A hidden sash is `display: none`, so the role query finds none. */
  public async expectShown(side: PanelSide, isShown: boolean): Promise<void> {
    await expect(this.sash(side)).toBeVisible({ visible: isShown });
  }

  public async expectValue(side: PanelSide, value: SashValue): Promise<void> {
    const sash = this.sash(side);
    const checks: ValueCheck[] = [
      [value.now, 'aria-valuenow'],
      [value.max, 'aria-valuemax'],
      [value.min, 'aria-valuemin']
    ];

    for (const [expected, attribute] of checks) {
      if (expected !== undefined) await expect(sash).toHaveAttribute(attribute, String(expected));
    }
  }

  public async expectControls(side: PanelSide, id: string): Promise<void> {
    await expect(this.sash(side)).toHaveAttribute('aria-controls', id);
  }

  public async expectPanelWidth(id: string, px: number): Promise<void> {
    const panel = this.page.locator(`#${id}`);
    const widthOf = async (): Promise<number> => panel.evaluate((element): number => element.getBoundingClientRect().width);

    await expect.poll(widthOf).toBeCloseTo(px, 0);
  }
}
