/* eslint-disable no-underscore-dangle -- the page's view-state stand-in is the exact name window.__state */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { PanelWidths } from '../../src/bridge/common/graph-view-state.type.ts';
import type { PanelSide } from '../../src/graph/common/graph-page.type.ts';
import { RESIZE_LABELS } from '../../src/graph/common/graph.const.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { ellipsisNameOf } from '../test/utils/graph-widgets.spec.util.ts';

/** How many pointer moves a drag takes to get from the grip to its target. */
const DRAG_STEPS = 5;

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

  /** Presses the grip's centre, moves `dx` px along the row in steps and releases. */
  public async drag(side: PanelSide, dx: number): Promise<void> {
    const box = await this.sash(side).boundingBox();

    if (box === null) throw new Error(`graph e2e: the ${side} sash has no box to drag`);

    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this.page.mouse.move(x + dx, y, { steps: DRAG_STEPS });
    await this.page.mouse.up();
  }

  public async press(side: PanelSide, key: string): Promise<void> {
    await this.sash(side).focus();
    await this.page.keyboard.press(key);
  }

  public async doubleClick(side: PanelSide): Promise<void> {
    await this.sash(side).dblclick();
  }

  /** The debounced save has caught up: the saved view state carries exactly these widths. */
  public async expectSaved(widths: PanelWidths): Promise<void> {
    const savedWidths = async (): Promise<PanelWidths | null> => {
      const raw = await this.page.evaluate((): unknown => window.__state);

      return readGraphViewState(raw)?.panelWidths ?? null;
    };

    await expect.poll(savedWidths).toEqual(widths);
  }

  /** The folder's "…" button shows: nothing covers it. */
  public async expectEllipsisShown(folder: string): Promise<void> {
    const ellipsis = this.page.getByRole('button', { name: ellipsisNameOf(folder), exact: true });

    await expect(ellipsis).toBeVisible();
  }

  public async expectPanelWidth(id: string, px: number): Promise<void> {
    const panel = this.page.locator(`#${id}`);
    const widthOf = async (): Promise<number> => panel.evaluate((element): number => element.getBoundingClientRect().width);

    await expect.poll(widthOf).toBeCloseTo(px, 0);
  }
}
