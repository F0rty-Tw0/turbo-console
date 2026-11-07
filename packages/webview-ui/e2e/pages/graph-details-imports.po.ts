import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { SCANNING_AGAIN_TEXT } from '../../src/graph/common/details-imports.const.ts';
import { DETAILS_LABEL } from '../../src/graph/common/graph.const.ts';
import { SCAN_AGAIN_NAME, SHOW_MORE_NAME } from '../common/graph-imports.const.ts';
import type { ImportGroupFacts, ImportRowFacts } from '../common/graph-imports.type.ts';

/** The imports block of the link view: its heading, status, rows by file, Show more, notes and Scan again. */
export class GraphDetailsImports {
  public readonly block: Locator;
  public readonly files: Locator;
  public readonly heading: Locator;
  public readonly lines: Locator;
  public readonly notes: Locator;
  public readonly numbers: Locator;
  public readonly root: Locator;
  public readonly rows: Locator;
  public readonly scanAgainButton: Locator;
  public readonly showMoreButton: Locator;
  public readonly status: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true }).locator('section.details-imports');
    this.block = this.root.locator('.details-imports-block');
    this.heading = this.block.getByRole('heading', { level: 3 });
    this.status = this.block.locator('p.details-status');
    this.lines = this.block.locator('p.details-line');
    this.files = this.block.locator('h4.details-file');
    this.rows = this.block.locator('button.import-row');
    this.numbers = this.rows.locator('.excerpt-number');
    this.showMoreButton = this.block.getByRole('button', { name: SHOW_MORE_NAME });
    this.notes = this.block.locator('p.details-muted');
    this.scanAgainButton = this.block.getByRole('button', { name: SCAN_AGAIN_NAME });
  }

  public async scanAgain(): Promise<void> {
    await this.scanAgainButton.click();
  }

  public async openRow(file: string, number: number): Promise<void> {
    await this.rowAt(file, number).click();
  }

  public async showMore(): Promise<void> {
    await this.showMoreButton.click();
  }

  public async focusRow(file: string, number: number): Promise<void> {
    await this.rowAt(file, number).focus();
  }

  public async focusScanAgain(): Promise<void> {
    await this.scanAgainButton.focus();
  }

  public async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  /** The block is still reading: the heading has no count, the look-up line names the link, Scan again is aria-disabled and no row is drawn. */
  public async expectScanning(source: string, target: string): Promise<void> {
    await expect(this.heading).toHaveText(`Imports of ${target}`);
    await expect(this.lines).toHaveText([`Looking for imports of ${target} in ${source}…`]);
    await expect(this.scanAgainButton).toHaveAttribute('aria-disabled', 'true');
    await expect(this.rows).toHaveCount(0);
  }

  /** The heading with its count, every file with its rows in order, and no status. */
  public async expectFound(heading: string, groups: ImportGroupFacts[]): Promise<void> {
    const fileNames = groups.map((group): string => group.file);
    const allNumbers = groups.flatMap((group): string[] => group.rows.map((row): string => String(row.number)));

    await expect(this.heading).toHaveText(heading);
    await expect(this.status).toHaveCount(0);
    await expect(this.files).toHaveText(fileNames);
    await expect(this.numbers).toHaveText(allNumbers);

    for (const group of groups) {
      for (const row of group.rows) {
        await this.expectRow(group.file, row);
      }
    }
  }

  /** The info icon's word and the line saying how many files were scanned. */
  public async expectNone(word: string, line: string): Promise<void> {
    await expect(this.status).toHaveText(word);
    await expect(this.lines).toHaveText([line]);
    await expect(this.rows).toHaveCount(0);
  }

  public async expectFailed(source: string): Promise<void> {
    await expect(this.status).toHaveText("Couldn't scan");
    await expect(this.lines).toHaveText([`Couldn't read the files of ${source}.`]);
  }

  public async expectNotes(notes: string[]): Promise<void> {
    await expect(this.notes).toHaveText(notes);
  }

  /** A second scan is running over a kept list: the "Scanning again…" line alone, the `rowCount` rows kept, Scan again aria-disabled. */
  public async expectStale(rowCount: number): Promise<void> {
    await expect(this.lines).toHaveText([SCANNING_AGAIN_TEXT]);
    await expect(this.rows).toHaveCount(rowCount);
    await expect(this.scanAgainButton).toHaveAttribute('aria-disabled', 'true');
  }

  public async expectNotStale(): Promise<void> {
    await expect(this.lines).toHaveCount(0);
    await expect(this.scanAgainButton).not.toHaveAttribute('aria-disabled', 'true');
  }

  public async expectRowCount(count: number): Promise<void> {
    await expect(this.rows).toHaveCount(count);
  }

  public async expectShowMore(label: string): Promise<void> {
    await expect(this.showMoreButton).toHaveText(label);
  }

  public async expectFocusOnScanAgain(): Promise<void> {
    await expect(this.scanAgainButton).toBeFocused();
  }

  public async expectFocusOnRow(file: string, number: number): Promise<void> {
    await expect(this.rowAt(file, number)).toBeFocused();
  }

  public async expectAbsent(): Promise<void> {
    await expect(this.root).toHaveCount(0);
  }

  private rowAt(file: string, number: number): Locator {
    const labelled = this.page.locator(`[aria-label^="Open ${file} at line ${number}: "]`);

    return this.rows.and(labelled);
  }

  private async expectRow(file: string, facts: ImportRowFacts): Promise<void> {
    const row = this.rowAt(file, facts.number);

    await expect(row.locator('.excerpt-number')).toHaveText(String(facts.number));
    await expect(row.locator('.import-text')).toHaveText(facts.text);
    await expect(row.locator('.import-tag')).toHaveText(facts.tags);
  }
}
