/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { DEPTH_LABEL, GROUP_BY_FOLDER_LABEL, SEARCH_LABEL, SHOW_ALL_LABEL, TAGS_LABEL } from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

/** The controls panel around the package grid: its toolbar toggle, search, depth, tags, Show all and count line. */
export class GraphControlsPage {
  public readonly count: Locator;
  public readonly depth: Locator;
  public readonly grouping: Locator;
  public readonly panel: Locator;
  public readonly searchBox: Locator;
  public readonly showAllButton: Locator;
  public readonly tags: Locator;
  public readonly toggleButton: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.toggleButton = page.getByRole('button', { name: /^Controls/ });
    this.searchBox = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true });
    const asides = page.getByRole('complementary', { includeHidden: true });
    const holder = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true, includeHidden: true });

    this.panel = asides.filter({ has: holder });
    this.depth = page.getByRole('spinbutton', { name: DEPTH_LABEL, exact: true });
    this.grouping = page.getByRole('checkbox', { name: GROUP_BY_FOLDER_LABEL, exact: true });
    this.tags = page.getByRole('group', { name: TAGS_LABEL, exact: true });
    this.showAllButton = page.getByRole('button', { name: SHOW_ALL_LABEL, exact: true });
    this.count = page.getByRole('status').filter({ hasText: /^Showing/ });
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

  public async toggleTag(tag: string): Promise<void> {
    await this.tags.getByRole('checkbox', { name: tag, exact: true }).click();
  }

  public async pressGrouping(): Promise<void> {
    await this.grouping.focus();
    await this.grouping.press('Space');
  }

  public async showAll(): Promise<void> {
    await this.showAllButton.click();
  }

  /** The panel is shown or hidden. */
  public async expectOpen(isOpen: boolean): Promise<void> {
    await expect(this.panel).toBeVisible({ visible: isOpen });
  }

  public async expectExpanded(isExpanded: boolean): Promise<void> {
    await expect(this.toggleButton).toHaveAttribute('aria-expanded', String(isExpanded));
  }

  /** The panel's border box is `px` wide, within half a pixel. */
  public async expectPanelWidth(px: number): Promise<void> {
    await expect.poll(async (): Promise<number> => this.panelWidth()).toBeCloseTo(px, 0);
  }

  public async expectToggleName(name: string): Promise<void> {
    await expect(this.toggleButton).toHaveAccessibleName(name);
  }

  public async expectCount(visible: number, total: number): Promise<void> {
    await expect(this.count).toHaveText(`Showing ${visible} of ${total} packages`);
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

  /** Unchecked, under the depth field in the page and in the DOM, and before Show all. */
  public async expectGroupingBelowDepth(): Promise<void> {
    await expect(this.grouping).not.toBeChecked();

    const depthBox = await this.depth.boundingBox();
    const groupingBox = await this.grouping.boundingBox();

    expect(groupingBox?.y).toBeGreaterThanOrEqual((depthBox?.y ?? 0) + (depthBox?.height ?? 0));

    const isInOrder = await this.isInDomOrder();

    expect(isInOrder).toBe(true);
  }

  public async expectGroupedFact(isOn: boolean): Promise<void> {
    await expect.poll(async (): Promise<boolean | null> => this.groupedFact()).toBe(isOn);
  }

  private async groupedFact(): Promise<boolean | null> {
    return this.page.evaluate((): boolean | null => window.__tcGraphProbe?.grouped() ?? null);
  }

  private async isInDomOrder(): Promise<boolean> {
    const depth = await this.depth.elementHandle();
    const showAll = await this.showAllButton.elementHandle();

    return this.grouping.evaluate(
      (grouping, { before, after }): boolean => {
        const isAfterDepth = before.compareDocumentPosition(grouping) === Node.DOCUMENT_POSITION_FOLLOWING;
        const isBeforeShowAll = grouping.compareDocumentPosition(after) === Node.DOCUMENT_POSITION_FOLLOWING;

        return isAfterDepth && isBeforeShowAll;
      },
      { before: depth, after: showAll }
    );
  }

  private async panelWidth(): Promise<number> {
    const rect = await this.panel.evaluate(readRect);

    return rect.width;
  }
}
