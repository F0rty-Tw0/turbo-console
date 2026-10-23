import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphMenusPage } from './graph-menus.po.ts';
import { SEARCH_LABEL } from '../../src/graph/common/graph.const.ts';
import { packageActionsLabelOf } from '../../src/graph/utils/controls-text.util.ts';
import type { SyntheticMove, ViewportPoint } from '../common/playwright.type.ts';
import { mouseDragAt, wheelLinesAt } from '../test/utils/graph-camera-events.spec.util.ts';
import { ellipsisNameOf } from '../test/utils/graph-widgets.spec.util.ts';

/** Wheel lines that zoom out by 2/3 in one Cytoscape step: `10^(−33 · (4/3) / 250)` ≈ 0.667. */
const TWO_THIRDS_LINES = 4 / 3;

/** How a widget menu is announced and the ways it closes, and where the page leaves the native context menu alone. */
export class GraphMenuPaths extends GraphMenusPage {
  /** Presses the folder's "…", as a second press while its menu is open. */
  public async pressFolderEllipsis(folder: string): Promise<void> {
    await this.widgets.ellipsisOf(folder).click();
  }

  /** Zooms out by 2/3 in a single wheel event at `point`, with focus left where it is; the page must not have wheeled yet. */
  public async zoomOutInOneStep(point: ViewportPoint): Promise<void> {
    const move: SyntheticMove = { point, amount: TWO_THIRDS_LINES };

    await this.container.evaluate(wheelLinesAt, move);
  }

  /** Pans `dx` px right from `point` by mouse events alone, so the zoom stays and no press closes the menu. */
  public async panWithoutPress(point: ViewportPoint, dx: number): Promise<void> {
    const move: SyntheticMove = { point, amount: dx };

    await this.container.evaluate(mouseDragAt, move);
  }

  public async focusSearch(): Promise<void> {
    await this.page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true }).focus();
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

  /** At least one `contextmenu` fired since `recordContextMenus`, and none was prevented, so the native menu may open. */
  public async expectNativeContextMenuAllowed(): Promise<void> {
    await expect.poll(async (): Promise<boolean[]> => this.contextMenus()).not.toHaveLength(0);
    expect(await this.contextMenus()).not.toContain(true);
  }

  private async expectMenuNamed(opener: Locator, name: string): Promise<void> {
    await expect(opener).toHaveAttribute('aria-haspopup', 'menu');
    await expect(this.page.getByRole('menu', { name, exact: true })).toBeVisible();
  }
}
