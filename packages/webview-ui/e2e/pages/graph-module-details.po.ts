import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { MODULE_DETAILS_ID, MODULE_EMPTY_TEXT } from '../common/graph-module-panels.const.ts';
import type { ModuleGroupFacts, ModuleRowFacts } from '../common/graph-module-panels.type.ts';

type FocusText = 'Focus' | 'Clear focus';

/** A block heading: the list's name, with or without a ` (<count>)` after it. */
const headingPatternOf = (heading: string): RegExp => new RegExp(`^${heading}( \\(\\d+\\))?$`);

const rowCountOf = (groups: ModuleGroupFacts[]): number => groups.reduce((sum, group): number => sum + group.rows.length, 0);

/**
 * The module Details aside's views (spec §6.3): the title in its Details bar, the empty hint, the imports blocks with their
 * rows by group, and the Focus button. Every query stays inside `#graph-module-details`.
 */
export class GraphModuleDetailsPage {
  private readonly page: Page;
  private readonly panel: Locator;
  private readonly content: Locator;
  private readonly title: Locator;
  private readonly blocks: Locator;
  private readonly rows: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.panel = page.locator(`#${MODULE_DETAILS_ID}`);
    this.content = this.panel.locator('.details-content');
    this.title = this.panel.locator('.details-summary');
    this.blocks = this.panel.locator('.details-imports-block');
    this.rows = this.panel.locator('button.import-row');
  }

  public async openRow(heading: string, file: string, number: number): Promise<void> {
    const block = this.blockOf(heading);

    await this.rowIn(block, file, number).click();
  }

  public async pressFocus(): Promise<void> {
    await this.focusButtonOf('Focus').click();
  }

  public async expectTitle(title: string): Promise<void> {
    await expect(this.title).toHaveText(title);
  }

  public async expectEmpty(): Promise<void> {
    await expect(this.panel).toContainText(MODULE_EMPTY_TEXT);
    await expect(this.rows).toHaveCount(0);
  }

  /** The empty hint holds keyboard focus. */
  public async expectEmptyFocused(): Promise<void> {
    await expect(this.content.locator('.details-lead')).toBeFocused();
  }

  /** The blocks shown are exactly these, in order, each by its `h3` heading. */
  public async expectBlocks(headings: string[]): Promise<void> {
    const patterns = headings.map(headingPatternOf);

    await expect(this.blocks.locator('h3')).toHaveText(patterns);
  }

  /** The block `heading` shows exactly `groups`: their labels in order, and each row's line, text and tags. */
  public async expectGroups(heading: string, groups: ModuleGroupFacts[]): Promise<void> {
    const block = this.blockOf(heading);
    const labels = groups.map((group): string => group.label);
    const rowCount = rowCountOf(groups);

    await expect(block.locator('h4.details-file')).toHaveText(labels);
    await expect(block.locator('button.import-row')).toHaveCount(rowCount);

    for (const group of groups) for (const row of group.rows) await this.expectRow(block, row);
  }

  public async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  public async expectFocusButton(text: FocusText): Promise<void> {
    await expect(this.focusButtonOf(text)).toBeVisible();
  }

  private focusButtonOf(text: FocusText): Locator {
    return this.content.getByRole('button', { name: text, exact: true });
  }

  private blockOf(heading: string): Locator {
    const name = headingPatternOf(heading);
    const titled = this.page.getByRole('heading', { level: 3, name });

    return this.blocks.filter({ has: titled });
  }

  private rowIn(block: Locator, file: string, number: number): Locator {
    const labelled = this.page.locator(`[aria-label^="Open ${file} at line ${number}: "]`);

    return block.locator('button.import-row').and(labelled);
  }

  private async expectRow(block: Locator, facts: ModuleRowFacts): Promise<void> {
    const row = this.rowIn(block, facts.file, facts.number);

    await expect(row.locator('.excerpt-number')).toHaveText(String(facts.number));
    await expect(row.locator('.import-text')).toHaveText(facts.text);
    await expect(row.locator('.import-tag')).toHaveText(facts.tags);
  }
}
