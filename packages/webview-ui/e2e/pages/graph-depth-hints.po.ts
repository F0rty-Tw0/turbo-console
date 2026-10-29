import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { START_TRACE_LABEL, START_TRACE_TITLE } from '../../src/graph/common/details.const.ts';

const expectBelow = async (lower: Locator, upper: Locator): Promise<void> => {
  const lowerBox = await lower.boundingBox();
  const upperBox = await upper.boundingBox();

  if (lowerBox === null || upperBox === null) throw new Error('a hint or its input has no box');

  expect(lowerBox.y).toBeGreaterThanOrEqual(upperBox.y + upperBox.height);
};

/** The depth hints under the Controls inputs and the Start trace titles in the details panel and the package menu. */
export class GraphDepthHints {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /** The input labelled `label` is described by `hint`, and the visible hint starts below the input. */
  public async expectHint(label: string, hint: string): Promise<void> {
    const input = this.page.getByLabel(label, { exact: true });
    const note = this.page.getByText(hint, { exact: true });

    await expect(input).toHaveAccessibleDescription(hint);
    await expect(note).toBeVisible();
    await expectBelow(note, input);
  }

  /** The details panel Start trace button has the trace title. */
  public async expectButtonTitle(): Promise<void> {
    const details = this.page.locator('#graph-details');
    const button = details.getByRole('button', { name: START_TRACE_LABEL, exact: true });

    await expect(button).toHaveAttribute('title', START_TRACE_TITLE);
  }

  /** The open package menu's Start trace item has the trace title. */
  public async expectMenuItemTitle(): Promise<void> {
    const item = this.page.getByRole('menu').getByRole('menuitem', { name: START_TRACE_LABEL, exact: true });

    await expect(item).toHaveAttribute('title', START_TRACE_TITLE);
  }
}
