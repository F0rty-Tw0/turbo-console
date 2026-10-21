import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { DEPTH_LABEL, SEARCH_LABEL, SHOW_ALL_LABEL, TAGS_LABEL } from '../../src/graph/common/graph.const.ts';

type GroupState = 'checked' | 'unchecked' | 'mixed';

/** A name button's accessible name is the package name; the focus button's starts with `Focus `. */
const NAME_BUTTON = /^(?!Focus )/;

const DIMMED = /is-dimmed/;

/** The controls panel: its toolbar toggle, search, depth, tags, Show all, count line and the package grid. */
export class GraphControlsPage {
  private readonly count: Locator;
  private readonly currentRows: Locator;
  private readonly depth: Locator;
  private readonly grid: Locator;
  private readonly headers: Locator;
  private readonly page: Page;
  private readonly panel: Locator;
  private readonly rows: Locator;
  private readonly searchBox: Locator;
  private readonly showAllButton: Locator;
  private readonly tags: Locator;
  private readonly toggleButton: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.toggleButton = page.getByRole('button', { name: /^Controls/ });
    this.panel = page.getByRole('complementary', { includeHidden: true });
    this.searchBox = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true });
    this.depth = page.getByRole('spinbutton', { name: DEPTH_LABEL, exact: true });
    this.tags = page.getByRole('group', { name: TAGS_LABEL, exact: true });
    this.showAllButton = page.getByRole('button', { name: SHOW_ALL_LABEL, exact: true });
    this.count = page.getByRole('status').filter({ hasText: /^Showing/ });
    this.grid = page.getByRole('grid');
    this.headers = this.grid.getByRole('row').filter({ hasNot: page.getByRole('button') });
    this.rows = this.grid.getByRole('row').filter({ has: page.getByRole('button') });
    this.currentRows = this.grid.locator('[aria-current="true"]');
  }

  public async toggle(): Promise<void> {
    await this.toggleButton.click();
  }

  public async search(text: string): Promise<void> {
    await this.searchBox.fill(text);
  }

  public async setDepth(text: string): Promise<void> {
    await this.depth.fill(text);
  }

  public async blurDepth(): Promise<void> {
    await this.depth.blur();
  }

  public async toggleRow(name: string): Promise<void> {
    await this.showCheck(name).click();
  }

  public async toggleGroup(label: string): Promise<void> {
    await this.groupCheck(label).click();
  }

  public async toggleTag(tag: string): Promise<void> {
    await this.tags.getByRole('checkbox', { name: tag, exact: true }).click();
  }

  public async focusOn(name: string): Promise<void> {
    await this.grid.getByRole('button', { name: `Focus ${name}`, exact: true }).click();
  }

  /** Forced: a name button outside the visible set is `aria-disabled`, and a real click still lands on it. */
  public async pick(name: string): Promise<void> {
    await this.nameButton(name).click({ force: true });
  }

  public async showAll(): Promise<void> {
    await this.showAllButton.click();
  }

  /** The panel is shown or hidden. */
  public async expectOpen(isOpen: boolean): Promise<void> {
    if (isOpen) await expect(this.panel).toBeVisible();
    else await expect(this.panel).toBeHidden();
  }

  public async expectExpanded(isExpanded: boolean): Promise<void> {
    await expect(this.toggleButton).toHaveAttribute('aria-expanded', String(isExpanded));
  }

  public async expectToggleName(name: string): Promise<void> {
    await expect(this.toggleButton).toHaveAccessibleName(name);
  }

  public async expectCount(visible: number, total: number): Promise<void> {
    await expect(this.count).toHaveText(`Showing ${visible} of ${total} packages`);
  }

  public async expectRowChecked(name: string, isChecked: boolean): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked({ checked: isChecked });
  }

  /** The row's box is checked and cannot be unchecked: it is the focused package. */
  public async expectRowLocked(name: string): Promise<void> {
    await expect(this.showCheck(name)).toBeChecked();
    await expect(this.showCheck(name)).toHaveAttribute('aria-disabled', 'true');
  }

  public async expectRowDimmed(name: string, isDimmed: boolean): Promise<void> {
    if (isDimmed) await expect(this.rowOf(name)).toHaveClass(DIMMED);
    else await expect(this.rowOf(name)).not.toHaveClass(DIMMED);
  }

  /** `name` is the one row marked current; `null` means no row is. */
  public async expectRowCurrent(name: string | null): Promise<void> {
    if (name === null) {
      await expect(this.currentRows).toHaveCount(0);

      return;
    }

    await expect(this.rowOf(name)).toHaveAttribute('aria-current', 'true');
    await expect(this.currentRows).toHaveCount(1);
  }

  public async expectGroupState(label: string, state: GroupState): Promise<void> {
    const group = this.groupCheck(label);

    if (state === 'mixed') {
      await expect(group).toBeChecked({ indeterminate: true });

      return;
    }

    await expect(group).toBeChecked({ checked: state === 'checked' });
    await expect(group).not.toBeChecked({ indeterminate: true });
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
    await expect(this.grid.getByRole('button', { name: NAME_BUTTON })).toHaveText(names);
  }

  public async expectNoTagsFieldset(): Promise<void> {
    await expect(this.tags).toHaveCount(0);
  }

  public async expectTags(tags: string[]): Promise<void> {
    await expect(this.tags.locator('label')).toHaveText(tags);
  }

  public async expectShowAllDisabled(isDisabled: boolean): Promise<void> {
    await expect(this.showAllButton).toHaveAttribute('aria-disabled', String(isDisabled));
  }

  public async expectDepthValue(text: string): Promise<void> {
    await expect(this.depth).toHaveValue(text);
  }

  public async expectSearchValue(text: string): Promise<void> {
    await expect(this.searchBox).toHaveValue(text);
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
