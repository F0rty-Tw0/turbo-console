import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { LEGEND_LABEL } from '../../src/graph/common/legend.const.ts';

/** The toolbar's Legend button and the popover it opens, read through their roles and names. */
export class GraphLegend {
  public readonly button: Locator;
  public readonly panel: Locator;

  private readonly heading: Locator;

  public constructor(page: Page) {
    this.button = page.getByRole('button', { name: LEGEND_LABEL, exact: true });
    this.panel = page.getByRole('region', { name: LEGEND_LABEL, exact: true });
    this.heading = page.getByRole('heading', { name: LEGEND_LABEL, exact: true });
  }

  public async open(): Promise<void> {
    await this.button.click();
  }

  public async expectOpen(isOpen: boolean): Promise<void> {
    await expect(this.panel).toBeVisible({ visible: isOpen });
  }

  /** The shown list's terms are exactly `texts`, in order; the other mode's list is not shown. */
  public async expectTerms(texts: string[]): Promise<void> {
    await expect(this.panel.locator('dt:visible')).toHaveText(texts);
  }

  /** The swatch drawn beside the term `term`. */
  public swatchOf(term: string): Locator {
    const row = this.panel.getByText(term, { exact: true }).locator('..');

    return row.locator('svg');
  }

  /** The one dashed `tag` part of the term's swatch; strict, so a second dashed part fails the read. */
  public dashOf(term: string, tag: 'rect' | 'line'): Locator {
    const swatch = this.swatchOf(term);

    return swatch.locator(`${tag}[stroke-dasharray]`);
  }

  /** The frame of a box swatch with no outline and no nested box: its only rect. */
  public frameOf(term: string): Locator {
    const swatch = this.swatchOf(term);

    return swatch.locator('rect');
  }

  public async expectHeadingFocused(): Promise<void> {
    await expect(this.heading).toBeFocused();
  }

  public async expectButtonFocused(): Promise<void> {
    await expect(this.button).toBeFocused();
  }
}
