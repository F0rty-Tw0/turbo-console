import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';

/** The widget menus a "…" opens over the canvas. */
export class GraphMenusPage {
  public readonly menu: Locator;

  private readonly widgets: GraphWidgetsPage;

  public constructor(page: Page) {
    this.widgets = new GraphWidgetsPage(page);
    this.menu = page.getByRole('menu');
  }

  /** Presses the folder's "…" and waits for its menu. */
  public async openFolderMenu(folder: string): Promise<void> {
    await this.widgets.ellipsisOf(folder).click();
    await expect(this.menu).toBeVisible();
  }

  /** The open menu's item named exactly `name`, a plain item or a checkbox item. */
  public item(name: string): Locator {
    const plain = this.menu.getByRole('menuitem', { name, exact: true });
    const checkbox = this.menu.getByRole('menuitemcheckbox', { name, exact: true });

    return plain.or(checkbox);
  }

  public async expectNoMenu(): Promise<void> {
    await expect(this.menu).toHaveCount(0);
  }

  /** The menu closed and gave focus back to the folder's "…". */
  public async expectFocusOnEllipsis(folder: string): Promise<void> {
    await this.expectNoMenu();
    await expect(this.widgets.ellipsisOf(folder)).toBeFocused();
  }
}
