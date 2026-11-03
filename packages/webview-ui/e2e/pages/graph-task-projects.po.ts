import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { TASK_CONTROLS_ID } from '../../src/graph/common/graph-task.const.ts';
import type { CheckReading } from '../common/graph-task-projects.type.ts';

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

  /** The check named `label` reads `reading`; a mixed one is unchecked and indeterminate. */
  public async expectCheck(label: string, reading: CheckReading): Promise<void> {
    const box = this.checkbox(label);

    if (reading === 'mixed') {
      await expect(box).toBeChecked({ indeterminate: true });

      return;
    }

    await expect(box).toBeChecked({ checked: reading === 'checked' });
  }

  /** Every check named in `labels` reads `reading`. */
  public async expectChecks(labels: string[], reading: CheckReading): Promise<void> {
    for (const label of labels) await this.expectCheck(label, reading);
  }

  /**
   * Presses the name of task `id`, found by its title because task names repeat across projects. Forced: an undrawn
   * task's name is `aria-disabled`, and a real click still lands on it; Playwright would otherwise wait for it to enable.
   */
  public async pick(id: string): Promise<void> {
    await this.grid.locator(`button[title="${id}"]`).click({ force: true });
  }

  private nameButton(title: string): Locator {
    return this.grid.getByRole('button', { name: title, exact: true });
  }

  private checkbox(label: string): Locator {
    return this.grid.getByRole('checkbox', { name: label, exact: true });
  }
}
