import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** A name button's accessible name is the package name; the focus button's starts with `Focus `. */
const NAME_BUTTON = /^(?!Focus )/;

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
    this.headers = this.grid.getByRole('row').filter({ hasNot: page.getByRole('button') });
    this.rows = this.grid.getByRole('row').filter({ has: page.getByRole('button') });
    this.nameButtons = this.grid.getByRole('button', { name: NAME_BUTTON });
    this.currentRows = this.grid.locator('[aria-current="true"]');
  }

  public async toggleRow(name: string): Promise<void> {
    await this.showCheck(name).click();
  }

  public async toggleGroup(label: string): Promise<void> {
    await this.groupCheck(label).click();
  }

  public async focusOn(name: string): Promise<void> {
    await this.grid.getByRole('button', { name: `Focus ${name}`, exact: true }).click();
  }

  /** Forced: a name button outside the visible set is `aria-disabled`, and a real click still lands on it. */
  public async pick(name: string): Promise<void> {
    await this.nameButton(name).click({ force: true });
  }

  /** Moves keyboard focus to the name button without pressing it. */
  public async focusName(name: string): Promise<void> {
    await this.nameButton(name).focus();
  }

  public async expectRowChecked(name: string, isChecked: boolean): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked({ checked: isChecked });
  }

  /** The row's box is checked and cannot be unchecked: it is the focused package. */
  public async expectRowLocked(name: string): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked();
    await expect(this.showCheck(name)).toHaveAttribute('aria-disabled', 'true');
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
    await expect(this.headers).toHaveText(labels);
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
