import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** A name button's accessible name is the package name; the focus button's starts with `Focus `, a header's with `Expand folder ` or `Collapse folder `. */
const NAME_BUTTON = /^(?!Focus |Expand folder |Collapse folder )/;

const FOLDER_TOGGLE = /^(Expand|Collapse) folder /;

const DIMMED = /is-dimmed/;

/** The controls panel's package grid: folder headers with their group checkboxes, then rows of Show, name and Focus. */
export class GraphPackageList {
  public readonly currentRows: Locator;
  public readonly grid: Locator;
  public readonly headers: Locator;
  public readonly nameButtons: Locator;
  public readonly rows: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.grid = page.getByRole('grid');
    const focusButton = page.getByRole('button', { name: /^Focus / });

    this.headers = this.grid.getByRole('row').filter({ hasNot: focusButton });
    this.rows = this.grid.getByRole('row').filter({ has: focusButton });
    this.nameButtons = this.grid.getByRole('button', { name: NAME_BUTTON });
    this.currentRows = this.grid.locator('[aria-current="true"]');
  }

  public async toggleRow(name: string): Promise<void> {
    await this.showCheck(name).click();
  }

  /** Dispatches the click on the row's checkbox, which does not move keyboard focus to it. */
  public async uncheckWithoutFocus(name: string): Promise<void> {
    await this.showCheck(name).dispatchEvent('click');
  }

  public async toggleGroup(label: string): Promise<void> {
    await this.groupCheck(label).click();
  }

  public async focusOn(name: string): Promise<void> {
    await this.grid.getByRole('button', { name: `Focus ${name}`, exact: true }).click();
  }

  /**
   * Forced: a name button outside the visible set is `aria-disabled`, and a real click still lands on it. A forced click
   * skips the stable check and lands on a row that moved under it, so `hover`, which skips only the enabled check, waits
   * for the button to settle and take the pointer first.
   */
  public async pick(name: string): Promise<void> {
    const button = this.nameButton(name);

    await button.hover();
    await button.click({ force: true });
  }

  /** Moves keyboard focus to the name button without pressing it. */
  public async focusName(name: string): Promise<void> {
    await this.nameButton(name).focus();
  }

  /** Presses the header button named `name`, `Collapse folder apps` or `Expand folder apps`. */
  public async pressFolderToggle(name: string): Promise<void> {
    await this.folderToggle(name).click();
  }

  /** The header button named `name` shows `text` and reports `isExpanded`. */
  public async expectFolderToggle(name: string, text: string, isExpanded: boolean): Promise<void> {
    await expect(this.folderToggle(name)).toHaveText(text);
    await expect(this.folderToggle(name)).toHaveAttribute('aria-expanded', String(isExpanded));
  }

  /** No header shows an Expand or Collapse button: the page is flat. */
  public async expectNoFolderToggles(): Promise<void> {
    await expect(this.grid.getByRole('button', { name: FOLDER_TOGGLE })).toHaveCount(0);
  }

  public async expectRowChecked(name: string, isChecked: boolean): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked({ checked: isChecked });
  }

  /** The row's box is checked and cannot be unchecked: it is the focused package. */
  public async expectRowLocked(name: string): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked();
    await expect(this.showCheck(name)).toHaveAttribute('aria-disabled', 'true');
  }

  /** The row's box is checked and can be unchecked again: no focus holds it. */
  public async expectRowUnlocked(name: string): Promise<void> {
    await expect(this.showCheck(name)).not.toHaveAttribute('aria-disabled', 'true');
  }

  public async expectRowDimmed(name: string): Promise<void> {
    await expect(this.rowOf(name)).toHaveClass(DIMMED);
  }

  /** `name` is the one row marked current. */
  public async expectRowCurrent(name: string): Promise<void> {
    await expect(this.rowOf(name)).toHaveAttribute('aria-current', 'true');
    await expect(this.currentRows).toHaveCount(1);
  }

  public async expectNoRowCurrent(): Promise<void> {
    await expect(this.currentRows).toHaveCount(0);
  }

  public async expectGroupChecked(label: string, isChecked: boolean): Promise<void> {
    await expect(this.groupCheck(label)).toBeChecked({ checked: isChecked });
    await expect(this.groupCheck(label)).not.toBeChecked({ indeterminate: true });
  }

  public async expectGroupMixed(label: string): Promise<void> {
    await expect(this.groupCheck(label)).toBeChecked({ indeterminate: true });
  }

  /** The group's box is checked and cannot be unchecked: its only package is the focused one. */
  public async expectGroupLocked(label: string): Promise<void> {
    await expect(this.groupCheck(label)).toBeChecked();
    await expect(this.groupCheck(label)).toHaveAttribute('aria-disabled', 'true');
  }

  /** The group headers shown, in list order. */
  public async expectGroups(labels: string[]): Promise<void> {
    await expect(this.headers).toHaveText(labels, { useInnerText: true });
  }

  /** The package rows shown, in list order. */
  public async expectRowsListed(names: string[]): Promise<void> {
    await expect(this.nameButtons).toHaveText(names);
  }

  public async expectPickDisabled(name: string): Promise<void> {
    await expect(this.nameButton(name)).toHaveAttribute('aria-disabled', 'true');
  }

  public async expectGridShape(groupCount: number, rowCount: number): Promise<void> {
    await expect(this.headers).toHaveCount(groupCount);
    await expect(this.rows).toHaveCount(rowCount);
  }

  private folderToggle(name: string): Locator {
    return this.grid.getByRole('button', { name, exact: true });
  }

  private showCheck(name: string): Locator {
    return this.grid.getByRole('checkbox', { name: `Show ${name}`, exact: true });
  }

  private groupCheck(label: string): Locator {
    return this.grid.getByRole('checkbox', { name: label, exact: true });
  }

  private nameButton(name: string): Locator {
    return this.grid.getByRole('button', { name, exact: true });
  }

  /** Hidden rows count: a search that leaves a package out hides its row, and its marks stay on it. */
  private rowOf(name: string): Locator {
    const check = this.page.getByRole('checkbox', { name: `Show ${name}`, exact: true, includeHidden: true });

    return this.grid.getByRole('row', { includeHidden: true }).filter({ has: check });
  }
}
