import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { MODE_LABEL, TASKS_MODE_LABEL } from '../../src/graph/common/graph-task.const.ts';

/** The texts among `elements` that differ from `label`; self-contained, it runs in the page. */
const otherTextsThan = (elements: Element[], label: string): (string | null)[] => {
  const texts = elements.map((element) => element.textContent);

  return texts.filter((text) => text !== label);
};

/** A single-package window's task page: no Packages and Tasks buttons, and the root label where `//` would print. */
export class GraphSinglePackage {
  public readonly modeGroup: Locator;
  public readonly modeSeparator: Locator;
  public readonly tasksButton: Locator;

  private readonly packages: Locator;

  public constructor(page: Page) {
    this.modeGroup = page.locator(`[role="group"][aria-label="${MODE_LABEL}"]`);
    this.tasksButton = this.modeGroup.locator('button').filter({ hasText: TASKS_MODE_LABEL });
    this.modeSeparator = page.locator('.toolbar-separator').first();
    this.packages = page.locator('.controls-task-package');
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

  /** At least one task row is listed, and every row's package description reads `label`. */
  public async expectRowPackagesRead(label: string): Promise<void> {
    await expect(this.packages.first()).toBeAttached();
    await expect.poll(async (): Promise<(string | null)[]> => this.packages.evaluateAll(otherTextsThan, label)).toEqual([]);
  }
}
