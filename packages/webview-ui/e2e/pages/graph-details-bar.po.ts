import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GraphIconId } from '../../src/graph/common/graph-icon.type.ts';
import { CLEAR_LABEL } from '../../src/graph/common/graph.const.ts';

/** Where the bar sits: the id of its parent aside, and whether it is that aside's first child. */
type BarPlace = {
  readonly parentId: string | null;
  readonly isFirst: boolean;
};

const placeOf = (bar: Element): BarPlace => {
  const parent = bar.parentElement;
  const place: BarPlace = { parentId: parent?.id ?? null, isFirst: parent?.firstElementChild === bar };

  return place;
};

/** The Details bar `div.details-bar`: the selection summary and Clear selection, at the top of the mounted Details aside. */
export class GraphDetailsBar {
  public readonly bar: Locator;
  public readonly summary: Locator;
  public readonly clear: Locator;

  public constructor(page: Page) {
    this.bar = page.locator('.details-bar');
    this.summary = this.bar.locator('.details-summary');
    this.clear = this.bar.getByRole('button', { name: CLEAR_LABEL, exact: true, includeHidden: true });
  }

  public async pressClear(): Promise<void> {
    await this.clear.click();
  }

  /** Nothing selected: the bar is hidden and Clear selection is disabled. */
  public async expectClearHidden(): Promise<void> {
    await expect(this.bar).toBeHidden();
    await expect(this.clear).toBeDisabled();
  }

  /** Something selected: the bar shows and Clear selection is enabled. */
  public async expectClearShown(): Promise<void> {
    await expect(this.bar).toBeVisible();
    await expect(this.clear).toBeEnabled();
  }

  /** Clear selection holds an `aria-hidden` icon span with the id's Codicon class, and no text. */
  public async expectClearIcon(iconId: GraphIconId): Promise<void> {
    const icon = this.clear.locator('span').first();

    await expect(icon).toHaveClass(new RegExp(`codicon-${iconId}`));
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(this.clear).toHaveText('');
  }

  public async expectSummary(text: string): Promise<void> {
    await expect(this.summary).toHaveText(text);
  }

  /** The bar is the first child of the aside `#<asideId>`. */
  public async expectFirstIn(asideId: string): Promise<void> {
    const expected: BarPlace = { parentId: asideId, isFirst: true };

    await expect.poll(async (): Promise<BarPlace> => this.bar.evaluate(placeOf)).toStrictEqual(expected);
  }
}
