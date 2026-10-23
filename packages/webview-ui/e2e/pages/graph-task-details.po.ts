import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import { RUN_LABEL, RUN_NO_CACHE_LABEL, STOP_LABEL, TASK_DETAILS_ID } from '../../src/graph/common/graph-task.const.ts';

/** The task side panel `#graph-task-details`: the selected task's name, command, run state, dependencies and run buttons. */
export class GraphTaskDetails {
  public readonly panel: Locator;
  public readonly run: Locator;
  public readonly runWithoutCache: Locator;
  public readonly stop: Locator;

  public constructor(page: Page) {
    this.panel = page.locator(`#${TASK_DETAILS_ID}`);
    this.run = this.panel.getByRole('button', { name: RUN_LABEL, exact: true });
    this.runWithoutCache = this.panel.getByRole('button', { name: RUN_NO_CACHE_LABEL, exact: true });
    this.stop = this.panel.getByRole('button', { name: STOP_LABEL, exact: true });
  }

  /** Clicks the dependency button named by its task id. */
  public async pickDependency(taskId: string): Promise<void> {
    await this.panel.getByRole('button', { name: taskId, exact: true }).click();
  }

  /** Run is on screen; its centre in page pixels. */
  public async runSpot(): Promise<Position> {
    await expect(this.run).toBeVisible();

    const box = await this.run.boundingBox();

    expect(box).not.toBeNull();

    const x = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    const spot: Position = { x, y };

    return spot;
  }

  /** The panel's heading reads the task name and its command line reads `command`. */
  public async expectTask(name: string, command: string): Promise<void> {
    await expect(this.panel.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(this.panel.locator('.details-code')).toHaveText(command);
  }

  /** The run state line reads `word`, or no state line shows for `null`. */
  public async expectState(word: string | null): Promise<void> {
    const state = this.panel.locator('.task-run-state');

    if (word === null) {
      await expect(state).toBeHidden();

      return;
    }

    await expect(state).toHaveText(word);
  }

  /** The panel shows no task: no heading, no button. */
  public async expectEmpty(): Promise<void> {
    await expect(this.panel.getByRole('heading')).toHaveCount(0);
    await expect(this.panel.getByRole('button')).toHaveCount(0);
  }
}
