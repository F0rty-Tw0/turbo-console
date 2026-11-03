import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { DETAILS_LABEL } from '../../src/graph/common/graph.const.ts';

const markKept = (element: Element): void => element.setAttribute('data-kept', 'yes');

/** The Details card's own heading element, told from a rebuilt one by a mark that only a kept element carries. */
export class GraphDetailsCard {
  public readonly heading: Locator;

  public constructor(page: Page) {
    const panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true, includeHidden: true });

    this.heading = panel.getByRole('heading', { level: 2 });
  }

  public async markHeading(): Promise<void> {
    await this.heading.evaluate(markKept);
  }

  /** The heading element is the one `markHeading` marked, so the card was repainted in place, not rebuilt. */
  public async expectHeadingKept(): Promise<void> {
    await expect(this.heading).toHaveAttribute('data-kept', 'yes');
  }
}
