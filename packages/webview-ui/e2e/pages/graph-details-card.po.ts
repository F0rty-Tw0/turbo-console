import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { EXCLUDE_LABEL, FOCUS_LABEL, START_TRACE_LABEL } from '../../src/graph/common/details.const.ts';
import { SHOW_MODULES_LABEL } from '../../src/graph/common/graph-module.const.ts';
import { SHOW_TASKS_LABEL } from '../../src/graph/common/graph-task.const.ts';
import { DETAILS_LABEL } from '../../src/graph/common/graph.const.ts';

const ROW_LABELS = [FOCUS_LABEL, EXCLUDE_LABEL, START_TRACE_LABEL, SHOW_TASKS_LABEL, SHOW_MODULES_LABEL];

const markKept = (element: Element): void => element.setAttribute('data-kept', 'yes');

/**
 * The Details card: its own heading element, told from a rebuilt one by a mark that only a kept element carries, and
 * its package action buttons Focus, Exclude, Start trace, Show tasks and Show modules.
 */
export class GraphDetailsCard {
  public readonly heading: Locator;

  private readonly panel: Locator;

  public constructor(page: Page) {
    this.panel = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true, includeHidden: true });
    this.heading = this.panel.getByRole('heading', { level: 2 });
  }

  /** The card's button named exactly `name`. */
  public button(name: string): Locator {
    return this.panel.getByRole('button', { name, exact: true });
  }

  public async markHeading(): Promise<void> {
    await this.heading.evaluate(markKept);
  }

  /** The heading element is the one `markHeading` marked, so the card was repainted in place, not rebuilt. */
  public async expectHeadingKept(): Promise<void> {
    await expect(this.heading).toHaveAttribute('data-kept', 'yes');
  }

  /** Each action button's icon is shown, or each is hidden. */
  public async expectRowIcons(isShown: boolean): Promise<void> {
    for (const label of ROW_LABELS) {
      const icon = this.button(label).locator('.codicon');

      await expect(icon, `the ${label} icon`).toBeVisible({ visible: isShown });
    }
  }

  /** Each action button shows its label. */
  public async expectRowLabels(): Promise<void> {
    for (const label of ROW_LABELS) {
      const button = this.button(label);

      await expect(button, `the ${label} button`).toBeVisible();
    }
  }
}
