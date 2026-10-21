import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { DEPTH_LABEL, SEARCH_LABEL, SHOW_ALL_LABEL, TAGS_LABEL } from '../../src/graph/common/graph.const.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

/** The controls panel around the package grid: its toolbar toggle, search, depth, tags, Show all and count line. */
export class GraphControlsPage {
  public readonly count: Locator;
  public readonly depth: Locator;
  public readonly panel: Locator;
  public readonly searchBox: Locator;
  public readonly showAllButton: Locator;
  public readonly tags: Locator;
  public readonly toggleButton: Locator;

  public constructor(page: Page) {
    this.toggleButton = page.getByRole('button', { name: /^Controls/ });
    this.searchBox = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true });
    const asides = page.getByRole('complementary', { includeHidden: true });
    const holder = page.getByRole('searchbox', { name: SEARCH_LABEL, exact: true, includeHidden: true });

    this.panel = asides.filter({ has: holder });
    this.depth = page.getByRole('spinbutton', { name: DEPTH_LABEL, exact: true });
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

  private async panelWidth(): Promise<number> {
    const rect = await this.panel.evaluate(readRect);

    return rect.width;
  }
}
