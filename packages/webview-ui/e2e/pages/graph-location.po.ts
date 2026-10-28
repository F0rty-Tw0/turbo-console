import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { LOCATION_LABEL } from '../../src/graph/common/location.const.ts';

/** The location bar above the canvas: the crumb trail, then the folder focus info lines. */
export class GraphLocation {
  public readonly nav: Locator;

  public constructor(page: Page) {
    this.nav = page.getByRole('navigation', { name: LOCATION_LABEL, exact: true });
  }

  /** The crumb button labelled `label`; the current crumb is text, not a button. */
  public crumb(label: string): Locator {
    return this.nav.getByRole('button', { name: label, exact: true });
  }

  public async press(label: string): Promise<void> {
    await this.crumb(label).click();
  }

  /** The crumbs read `labels` in order and `current` is the one marked as the page. */
  public async expectCrumbs(labels: string[], current: string): Promise<void> {
    await expect(this.nav.locator('ol > li')).toHaveText(labels);
    await expect(this.nav.locator('[aria-current="page"]')).toHaveText(current);
  }

  public async expectLines(lines: string[]): Promise<void> {
    await expect(this.nav.locator('ul > li')).toHaveText(lines);
  }

  public async expectHidden(): Promise<void> {
    await expect(this.nav).toBeHidden();
  }
}
