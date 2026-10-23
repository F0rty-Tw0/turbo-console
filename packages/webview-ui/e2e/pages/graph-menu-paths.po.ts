import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphMenusPage } from './graph-menus.po.ts';
import { packageActionsLabelOf } from '../../src/graph/utils/controls-text.util.ts';
import { ellipsisNameOf } from '../test/utils/graph-widgets.spec.util.ts';

/** How a widget menu is announced and the ways it closes. */
export class GraphMenuPaths extends GraphMenusPage {
  /** Presses the folder's "…", as a second press while its menu is open. */
  public async pressFolderEllipsis(folder: string): Promise<void> {
    await this.widgets.ellipsisOf(folder).click();
  }

  /** The folder's "…", on a box or a collapsed node, announces a menu, and the open menu has the "…"'s name. */
  public async expectFolderMenuNamed(folder: string): Promise<void> {
    await this.expectMenuNamed(this.widgets.ellipsisOf(folder), ellipsisNameOf(folder));
  }

  public async expectPackageMenuNamed(name: string): Promise<void> {
    await this.expectMenuNamed(this.widgets.packageButton(name), packageActionsLabelOf(name));
  }

  /** No menu is open and focus sits on a control other than the folder's "…": the close left it where it went. */
  public async expectMenuLeftFor(folder: string): Promise<void> {
    await this.expectNoMenu();
    await expect(this.page.locator(':focus')).toHaveCount(1);
    await expect(this.widgets.ellipsisOf(folder)).not.toBeFocused();
  }

  private async expectMenuNamed(opener: Locator, name: string): Promise<void> {
    await expect(opener).toHaveAttribute('aria-haspopup', 'menu');
    await expect(this.page.getByRole('menu', { name, exact: true })).toBeVisible();
  }
}
