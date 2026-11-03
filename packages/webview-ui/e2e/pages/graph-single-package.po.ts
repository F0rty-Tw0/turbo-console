import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { MODE_LABEL, TASKS_MODE_LABEL } from '../../src/graph/common/graph-task.const.ts';

/** A single-package window's task page: no Packages and Tasks buttons, and the root label where `//` would print. */
export class GraphSinglePackage {
  public readonly modeGroup: Locator;
  public readonly modeSeparator: Locator;
  public readonly tasksButton: Locator;

  public constructor(page: Page) {
    this.modeGroup = page.locator(`[role="group"][aria-label="${MODE_LABEL}"]`);
    this.tasksButton = this.modeGroup.locator('button').filter({ hasText: TASKS_MODE_LABEL });
    this.modeSeparator = page.locator('.toolbar-separator').first();
  }

  /** The Packages and Tasks group and the separator after it are not shown. */
  public async expectModesHidden(): Promise<void> {
    await expect(this.modeGroup).toBeHidden();
    await expect(this.modeSeparator).toBeHidden();
  }

  /** Task mode is on: the hidden Tasks button is the pressed one, which `GraphTask.expectPressed` cannot find by role (a hidden group is out of the accessibility tree). */
  public async expectTaskMode(): Promise<void> {
    await expect(this.tasksButton).toHaveAttribute('aria-pressed', 'true');
  }
}
