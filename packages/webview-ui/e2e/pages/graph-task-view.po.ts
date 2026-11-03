import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { SHOW_SCRIPTS_LABEL, TASK_CONTROLS_ID } from '../../src/graph/common/graph-task.const.ts';
import { GROUP_BY_FOLDER_LABEL } from '../../src/graph/common/graph.const.ts';

/** The View part of the task Controls panel: its section titles and the Show scripts and Group by folder boxes. */
export class GraphTaskView {
  public readonly panel: Locator;
  public readonly scripts: Locator;

  private readonly grouping: Locator;

  public constructor(page: Page) {
    this.panel = page.locator(`#${TASK_CONTROLS_ID}`);
    this.scripts = page.getByRole('checkbox', { name: SHOW_SCRIPTS_LABEL, exact: true });
    this.grouping = page.getByRole('checkbox', { name: GROUP_BY_FOLDER_LABEL, exact: true });
  }

  /** The panel's section headings read `titles`, in order. */
  public async expectSectionTitles(titles: string[]): Promise<void> {
    await expect(this.panel.getByRole('heading', { level: 3 })).toHaveText(titles);
  }

  /** Show scripts is shown and ticked or not. */
  public async expectScripts(isChecked: boolean): Promise<void> {
    await expect(this.scripts).toBeVisible();
    await expect(this.scripts).toBeChecked({ checked: isChecked });
  }

  /** There is no Show scripts box; a hidden field is skipped by the role query. */
  public async expectScriptsAbsent(): Promise<void> {
    await expect(this.scripts).toHaveCount(0);
  }

  /** There is no Group by folder box on the page. */
  public async expectGroupingAbsent(): Promise<void> {
    await expect(this.grouping).toHaveCount(0);
  }
}
