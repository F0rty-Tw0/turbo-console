import { expect } from '@playwright/test';

import { GraphMenusPage } from './graph-menus.po.ts';

/** The ways a widget menu closes. */
export class GraphMenuPaths extends GraphMenusPage {
  /** Presses the folder's "…", as a second press while its menu is open. */
  public async pressFolderEllipsis(folder: string): Promise<void> {
    await this.widgets.ellipsisOf(folder).click();
  }

  /** No menu is open and focus sits on a control other than the folder's "…": the close left it where it went. */
  public async expectMenuLeftFor(folder: string): Promise<void> {
    await this.expectNoMenu();
    await expect(this.page.locator(':focus')).toHaveCount(1);
    await expect(this.widgets.ellipsisOf(folder)).not.toBeFocused();
  }
}
