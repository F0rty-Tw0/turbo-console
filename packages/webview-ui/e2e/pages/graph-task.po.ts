/* eslint-disable no-underscore-dangle -- the host stub keeps the saved view state as window.__state */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import {
  DEPENDENTS_DEPTH_LABEL,
  EMPTY_TASKS_TEXT,
  SEARCH_TASKS_LABEL,
  SHOW_ALL_TASKS_LABEL,
  TASK_CONTROLS_ID,
  TASK_MODE_LABEL
} from '../../src/graph/common/graph-task.const.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { tasksHiddenText } from '../../src/graph/utils/task-text.util.ts';

const titlesOf = (buttons: HTMLElement[]): string[] => buttons.map((button) => button.title);

/** Task mode's page parts: the Task mode toggle, the prompt, the cap banner, the notice and the task Controls panel. */
export class GraphTask {
  public readonly toggleButton: Locator;

  private readonly page: Page;
  private readonly probe: GraphProbePage;
  private readonly prompt: Locator;
  private readonly bannerText: Locator;
  private readonly showAll: Locator;
  private readonly notice: Locator;
  private readonly rows: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    this.toggleButton = page.getByRole('button', { name: TASK_MODE_LABEL, exact: true });
    this.prompt = page.getByText(EMPTY_TASKS_TEXT, { exact: true });
    this.bannerText = page.locator('.graph-task-banner-text');
    this.showAll = page.getByRole('button', { name: SHOW_ALL_TASKS_LABEL, exact: true });
    this.notice = page.locator('.graph-task-notice');
    this.rows = page.locator(`#${TASK_CONTROLS_ID}`).getByRole('grid').getByRole('button');
  }

  public async toggle(): Promise<void> {
    await this.toggleButton.click();
  }

  public async expectPressed(isPressed: boolean): Promise<void> {
    await expect(this.toggleButton).toHaveAttribute('aria-pressed', String(isPressed));
  }

  /** The prompt reads the exact copy and shows, or is hidden. */
  public async expectPrompt(isShown = true): Promise<void> {
    await expect(this.prompt).toBeVisible({ visible: isShown });
  }

  /** The cap banner reads `<hidden> tasks hidden` with Show all tasks, or is hidden for `null`. */
  public async expectBanner(hidden: number | null): Promise<void> {
    if (hidden === null) {
      await expect(this.showAll).toBeHidden();

      return;
    }

    await expect(this.bannerText).toHaveText(tasksHiddenText(hidden));
    await expect(this.showAll).toBeVisible();
  }

  public async showAllTasks(): Promise<void> {
    await this.showAll.click();
  }

  /** The task notice line reads `text`, or is hidden for `null`. */
  public async expectNotice(text: string | null): Promise<void> {
    if (text === null) {
      await expect(this.notice).toBeHidden();

      return;
    }

    await expect(this.notice).toHaveText(text);
    await expect(this.notice).toBeVisible();
  }

  public async setDepth(depth: number): Promise<void> {
    await this.page.getByRole('spinbutton', { name: DEPENDENTS_DEPTH_LABEL, exact: true }).fill(String(depth));
  }

  public async search(text: string): Promise<void> {
    await this.page.getByRole('searchbox', { name: SEARCH_TASKS_LABEL, exact: true }).fill(text);
  }

  /** The task list rows shown, by task id (each row button's `title`), in list order. */
  public async expectRows(labels: string[]): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.rows.evaluateAll(titlesOf)).toEqual(labels);
  }

  /** The debounced save has caught up with the task camera: the saved task view's zoom and pan are the probe's. */
  public async expectCameraSaved(): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isCameraSaved()).toBe(true);
  }

  private async isCameraSaved(): Promise<boolean> {
    const raw = await this.page.evaluate((): unknown => window.__state);
    const task = readGraphViewState(raw)?.task ?? null;
    const zoom = await this.probe.zoom();
    const pan: Position | null = await this.probe.pan();

    if (task === null || pan === null) return false;

    const isSamePan = task.pan.x === pan.x && task.pan.y === pan.y;

    return task.zoom === zoom && isSamePan;
  }
}
