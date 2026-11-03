import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { TASK_CONTROLS_ID } from '../../src/graph/common/graph-task.const.ts';

/** The `title` of each button; self-contained, it runs in the page. */
const titlesOf = (buttons: HTMLElement[]): string[] => buttons.map((button) => button.title);

/** The Projects grid of the task Controls panel: folder, project and task rows, each with a check and a name button. */
export class GraphTaskProjects {
  private readonly grid: Locator;

  public constructor(page: Page) {
    this.grid = page.locator(`#${TASK_CONTROLS_ID}`).getByRole('grid');
  }

  /** The grid's rows read `titles` top to bottom: a folder or project by its text, a task by its id. */
  public async expectLines(titles: string[]): Promise<void> {
    const buttons = this.grid.locator('[role=row] button');

    await expect.poll(async (): Promise<string[]> => buttons.evaluateAll(titlesOf)).toEqual(titles);
  }

  /** Presses the folder or project name `title`. */
  public async expand(title: string): Promise<void> {
    await this.nameButton(title).click();
  }

  /** Presses the folder or project name `title`; the same press as `expand`, named for the open row it closes. */
  public async collapse(title: string): Promise<void> {
    await this.nameButton(title).click();
  }

  /** The folder or project `title` reads open or closed. */
  public async expectOpen(title: string, isOpen: boolean): Promise<void> {
    await expect(this.nameButton(title)).toHaveAttribute('aria-expanded', String(isOpen));
  }

  public async check(label: string): Promise<void> {
    await this.checkbox(label).check();
  }

  public async uncheck(label: string): Promise<void> {
    await this.checkbox(label).uncheck();
  }

  /** The check named `label` reads checked or unchecked. */
  public async expectCheck(label: string, isChecked: boolean): Promise<void> {
    await expect(this.checkbox(label)).toBeChecked({ checked: isChecked });
  }

  /** The check named `label` reads mixed: unchecked and indeterminate. */
  public async expectMixed(label: string): Promise<void> {
    await expect(this.checkbox(label)).toBeChecked({ indeterminate: true });
  }

  /** Every check named in `labels` reads checked or unchecked. */
  public async expectChecks(labels: string[], isChecked: boolean): Promise<void> {
    for (const label of labels) await this.expectCheck(label, isChecked);
  }

  /**
   * Presses the name of task `id`, found by its title because task names repeat across projects. Forced: an undrawn
   * task's name is `aria-disabled`, and a real click still lands on it; Playwright would otherwise wait for it to enable.
   */
  public async pick(id: string): Promise<void> {
    await this.taskName(id).click({ force: true });
  }

  /** The name of task `id` reads dimmed: `aria-disabled`, as an undrawn task's name is. */
  public async expectDimmed(id: string): Promise<void> {
    await expect(this.taskName(id)).toHaveAttribute('aria-disabled', 'true');
  }

  private nameButton(title: string): Locator {
    return this.grid.getByRole('button', { name: title, exact: true });
  }

  private taskName(id: string): Locator {
    return this.grid.getByTitle(id, { exact: true });
  }

  private checkbox(label: string): Locator {
    return this.grid.getByRole('checkbox', { name: label, exact: true });
  }
}
