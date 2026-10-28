/* eslint-disable no-underscore-dangle -- the host stub keeps the saved view state as window.__state */

import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphProbePage } from './graph-probe.po.ts';
import type { Position } from '../../src/bridge/common/graph-state.type.ts';
import {
  DEPENDENTS_DEPTH_LABEL,
  EMPTY_TASKS_TEXT,
  MODE_LABEL,
  PACKAGES_MODE_LABEL,
  SEARCH_TASKS_LABEL,
  SHOW_ALL_TASKS_LABEL,
  SHOW_EVERY_TASK_LABEL,
  SHOW_TASKS_LABEL,
  TASKS_MODE_LABEL,
  TASK_CONTROLS_ID
} from '../../src/graph/common/graph-task.const.ts';
import { DETAILS_LABEL } from '../../src/graph/common/graph.const.ts';
import { readGraphViewState } from '../../src/graph/utils/graph-view-state.util.ts';
import { tasksHiddenText } from '../../src/graph/utils/task-text.util.ts';
import { nodeRectNamed, rectOf } from '../test/utils/graph-widgets.spec.util.ts';

const titlesOf = (buttons: HTMLElement[]): string[] => buttons.map((button) => button.title);

/** Task mode's page parts: the Packages and Tasks buttons, the prompt, the cap banner, the notice and the task Controls panel. */
export class GraphTask {
  public readonly packagesButton: Locator;
  public readonly tasksButton: Locator;
  public readonly showTasksButton: Locator;

  private readonly page: Page;
  private readonly aside: Locator;
  private readonly menuList: Locator;
  private readonly probe: GraphProbePage;
  private readonly prompt: Locator;
  private readonly showEvery: Locator;
  private readonly slow: Locator;
  private readonly bannerText: Locator;
  private readonly showAll: Locator;
  private readonly notice: Locator;
  private readonly rows: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.probe = new GraphProbePage(page);
    const modeGroup = page.getByRole('group', { name: MODE_LABEL, exact: true });

    this.packagesButton = modeGroup.getByRole('button', { name: PACKAGES_MODE_LABEL, exact: true });
    this.tasksButton = modeGroup.getByRole('button', { name: TASKS_MODE_LABEL, exact: true });
    this.prompt = page.getByText(EMPTY_TASKS_TEXT, { exact: true });
    this.showEvery = page.getByRole('button', { name: SHOW_EVERY_TASK_LABEL });
    this.slow = page.locator('p.graph-task-slow');
    this.bannerText = page.getByRole('status').and(page.locator('.graph-task-banner-text'));
    this.showAll = page.getByRole('button', { name: SHOW_ALL_TASKS_LABEL, exact: true });
    this.notice = page.locator('.graph-task-notice');
    this.rows = page.locator(`#${TASK_CONTROLS_ID}`).getByRole('grid').getByRole('button');
    this.aside = page.getByRole('complementary', { name: DETAILS_LABEL, exact: true });
    this.showTasksButton = this.detailsButton(SHOW_TASKS_LABEL);
    this.menuList = page.getByRole('menu');
  }

  /** The details panel's button named exactly `name`. */
  public detailsButton(name: string): Locator {
    return this.aside.getByRole('button', { name, exact: true });
  }

  /** Presses the selected task's "…" and waits for its menu. */
  public async menu(id: string): Promise<void> {
    await this.menuButton(id).click();
    await expect(this.menuList).toBeVisible();
  }

  /** The selected task's "…" covers the task's drawn top-right corner. */
  public async expectMenuButtonOnCorner(id: string): Promise<void> {
    await expect.poll(async (): Promise<boolean> => this.isOnCorner(id)).toBe(true);
  }

  /** Presses Tasks. */
  public async enter(): Promise<void> {
    await this.tasksButton.click();
  }

  /** Presses Packages. */
  public async leave(): Promise<void> {
    await this.packagesButton.click();
  }

  /** Exactly one mode button is pressed: Tasks in task mode, Packages in package mode. */
  public async expectPressed(isTaskMode: boolean): Promise<void> {
    await expect(this.packagesButton).toHaveAttribute('aria-pressed', String(!isTaskMode));
    await expect(this.tasksButton).toHaveAttribute('aria-pressed', String(isTaskMode));
  }

  /** The prompt reads the exact copy and shows, or is hidden. */
  public async expectPrompt(isShown = true): Promise<void> {
    await expect(this.prompt).toBeVisible({ visible: isShown });
  }

  /** The prompt's Show every task is shown and named exactly `text`. */
  public async expectShowEvery(text: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: text, exact: true })).toBeVisible();
  }

  public async clickShowEvery(): Promise<void> {
    await this.showEvery.click();
  }

  public async expectSlowHidden(): Promise<void> {
    await expect(this.slow).toBeHidden();
  }

  /** The prompt's slow line reads `text` and shows. */
  public async expectSlowText(text: string): Promise<void> {
    await expect(this.slow).toHaveText(text);
    await expect(this.slow).toBeVisible();
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

  private menuButton(id: string): Locator {
    return this.page.getByRole('button', { name: `Actions for ${id}`, exact: true });
  }

  private async isOnCorner(id: string): Promise<boolean> {
    const nodes = await this.probe.nodes();
    const zoom = await this.probe.zoom();
    const node = nodeRectNamed(nodes, zoom, id);
    const button = await rectOf(this.menuButton(id));
    const right = node.left + node.width;
    const isAcrossRight = button.left < right && right < button.left + button.width;
    const isAcrossTop = button.top < node.top && node.top < button.top + button.height;

    return isAcrossRight && isAcrossTop;
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
