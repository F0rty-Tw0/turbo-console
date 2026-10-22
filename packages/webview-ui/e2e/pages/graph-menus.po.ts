/* eslint-disable no-underscore-dangle -- the page under test records its contextmenu events on window.__contextMenus */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphWidgetsPage } from './graph-widgets.po.ts';
import {
  ALL_FOLDERS_LABEL,
  BREADCRUMB_LABEL,
  DETAILS_LABEL,
  GRAPH_LABEL,
  GROUP_BY_FOLDER_LABEL
} from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';
import { menuFaultsOf } from '../test/utils/graph-widgets.spec.util.ts';

type CheckedState = 'true' | 'false' | 'mixed';

/** How far from the container's top left the breadcrumb may sit, in px. */
const CORNER_REACH_PX = 16;

const recordContextMenus = (): void => {
  window.__contextMenus = [];
  document.addEventListener('contextmenu', (event): void => {
    window.__contextMenus?.push(event.defaultPrevented);
  });
};

/** The widget menus a "…" or Shift+F10 opens over the canvas, and the folder focus breadcrumb. */
export class GraphMenusPage {
  public readonly breadcrumb: Locator;
  public readonly menu: Locator;

  private readonly aside: Locator;
  private readonly container: Locator;
  private readonly grouping: Locator;
  private readonly page: Page;
  private readonly widgets: GraphWidgetsPage;

  public constructor(page: Page) {
    this.page = page;
    this.widgets = new GraphWidgetsPage(page);
    this.menu = page.getByRole('menu');
    this.breadcrumb = page.getByRole('navigation', { name: BREADCRUMB_LABEL, exact: true });
    this.aside = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.grouping = page.getByRole('checkbox', { name: GROUP_BY_FOLDER_LABEL, exact: true });
  }

  /** Presses the folder's "…" and waits for its menu. */
  public async openFolderMenu(folder: string): Promise<void> {
    await this.widgets.ellipsisOf(folder).click();
    await expect(this.menu).toBeVisible();
  }

  /** Presses the selected package's "…" and waits for its menu. */
  public async openPackageMenu(name: string): Promise<void> {
    await this.widgets.packageButton(name).click();
    await expect(this.menu).toBeVisible();
  }

  /** Shift+F10 on whatever has focus, then waits for the menu. */
  public async pressShiftF10(): Promise<void> {
    await this.page.keyboard.press('Shift+F10');
    await expect(this.menu).toBeVisible();
  }

  public async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /** The open menu's item named exactly `name`, a plain item or a checkbox item. */
  public item(name: string): Locator {
    const plain = this.menu.getByRole('menuitem', { name, exact: true });
    const checkbox = this.menu.getByRole('menuitemcheckbox', { name, exact: true });

    return plain.or(checkbox);
  }

  /** Forced: an `aria-disabled` item still receives a real click, and must do nothing with it. */
  public async pressDisabledItem(name: string): Promise<void> {
    await this.item(name).click({ force: true });
  }

  /** Presses "All folders" in the breadcrumb. */
  public async clickAllFolders(): Promise<void> {
    await this.breadcrumb.getByRole('button', { name: ALL_FOLDERS_LABEL, exact: true }).click();
  }

  /**
   * Unchecks Group by folder and fires its `input` event from the page, so keyboard focus stays in the open menu: a
   * pointer on the checkbox closes the menu first, which would hide the one path from an open menu to `groupingOff`.
   */
  public async ungroupWhileOpen(): Promise<void> {
    await this.grouping.evaluate((box): void => {
      if (!(box instanceof HTMLInputElement)) throw new Error('graph e2e: Group by folder is not a checkbox');

      box.checked = false;
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  /** Starts recording the `defaultPrevented` of every `contextmenu`, from a listener added after the page's own. */
  public async recordContextMenus(): Promise<void> {
    await this.page.evaluate(recordContextMenus);
  }

  public async expectNoMenu(): Promise<void> {
    await expect(this.menu).toHaveCount(0);
  }

  /** The menu's items, in order, by label. */
  public async expectItems(labels: string[]): Promise<void> {
    await expect(this.menu.locator('.widget-menu-item')).toHaveText(labels);
  }

  public async expectItemChecked(name: string, state: CheckedState): Promise<void> {
    await expect(this.item(name)).toHaveAttribute('aria-checked', state);
  }

  public async expectItemDisabled(name: string, isDisabled: boolean): Promise<void> {
    const item = this.item(name);

    if (isDisabled) await expect(item).toHaveAttribute('aria-disabled', 'true');
    else await expect(item).not.toHaveAttribute('aria-disabled', 'true');
  }

  public async expectFocusedItem(name: string): Promise<void> {
    await expect(this.item(name)).toBeFocused();
  }

  /** The menu closed and gave focus back to the folder's "…". */
  public async expectFocusOnEllipsis(folder: string): Promise<void> {
    await this.expectNoMenu();
    await expect(this.widgets.ellipsisOf(folder)).toBeFocused();
  }

  public async expectFocusOnContainer(): Promise<void> {
    await expect(this.container).toBeFocused();
  }

  public async expectFocusOnGrouping(): Promise<void> {
    await expect(this.grouping).toBeFocused();
  }

  /** The menu lies inside the container and ends at or left of the open details aside. */
  public async expectMenuInsideUncovered(): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.menuFaults()).toEqual([]);
  }

  /** At least one `contextmenu` fired since `recordContextMenus`, each was prevented, and only the page's own menu is open. */
  public async expectNoNativeContextMenu(): Promise<void> {
    await expect.poll(async (): Promise<boolean[]> => this.contextMenus()).not.toHaveLength(0);
    expect(await this.contextMenus()).not.toContain(false);
    await expect(this.menu).toHaveCount(1);
  }

  /** The breadcrumb shows the folder's title as the current page, its "All folders" button, and sits at the canvas top left. */
  public async expectBreadcrumbShown(title: string): Promise<void> {
    const current = this.breadcrumb.locator('[aria-current="page"]');

    await expect(this.breadcrumb).toBeVisible();
    await expect(this.breadcrumb.getByRole('button', { name: ALL_FOLDERS_LABEL, exact: true })).toBeVisible();
    await expect(current).toHaveText(title);
    await expect.poll(async (): Promise<number> => this.cornerReach()).toBeLessThanOrEqual(CORNER_REACH_PX);
  }

  public async expectBreadcrumbHidden(): Promise<void> {
    await expect(this.breadcrumb).toBeHidden();
  }

  public async expectBreadcrumbLines(lines: string[]): Promise<void> {
    await expect(this.breadcrumb.locator('.breadcrumb-line')).toHaveText(lines);
  }

  private async contextMenus(): Promise<boolean[]> {
    return this.page.evaluate((): boolean[] => window.__contextMenus ?? []);
  }

  private async menuFaults(): Promise<string[]> {
    const menu = await this.menu.evaluate(readRect);
    const container = await this.container.evaluate(readRect);
    const aside = await this.aside.evaluate(readRect);

    return menuFaultsOf(menu, container, Math.min(aside.left, container.left + container.width));
  }

  /** How far the breadcrumb's top left sits from the container's, the larger of the two offsets; far or negative offsets read large. */
  private async cornerReach(): Promise<number> {
    const nav = await this.breadcrumb.evaluate(readRect);
    const container = await this.container.evaluate(readRect);
    const across = nav.left - container.left;
    const down = nav.top - container.top;
    const isInside = across >= 0 && down >= 0;

    if (!isInside) return Number.POSITIVE_INFINITY;

    return Math.max(across, down);
  }
}
