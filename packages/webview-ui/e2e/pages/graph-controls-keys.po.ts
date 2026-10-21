import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { FocusStep } from '../common/graph.type.ts';
import type { AriaRoleName } from '../common/playwright.type.ts';
import { isInside, readRect } from '../test/utils/element-rect.spec.util.ts';

const MAX_TABS = 25;

/** The first line of an aria snapshot: `- checkbox "Show web" [checked]` names the role, then the accessible name. */
const SNAPSHOT_NAME = /^- [\w-]+ "((?:[^"\\]|\\.)*)"/;

/** Keyboard walking over the controls panel: Tab stops, the package grid's roving focus and what holds focus. */
export class GraphControlsKeys {
  private readonly focused: Locator;
  private readonly grid: Locator;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.focused = page.locator(':focus');
    this.grid = page.getByRole('grid');
  }

  /** Presses Tab until the focused control is named `name`; fails after 25 presses. */
  public async tabTo(name: string): Promise<void> {
    await this.pressUntil('Tab', name);
  }

  public async shiftTabTo(name: string): Promise<void> {
    await this.pressUntil('Shift+Tab', name);
  }

  public async type(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  public async expectFocusedName(name: string): Promise<void> {
    await expect(this.focused).toHaveAccessibleName(name);
  }

  public async expectFocusedRole(role: AriaRoleName): Promise<void> {
    await expect(this.focused).toHaveRole(role);
  }

  /** Presses each step's key, then expects focus on the control it names, before the next key. */
  public async expectWalk(steps: FocusStep[]): Promise<void> {
    for (const { key, focus } of steps) {
      await this.page.keyboard.press(key);
      await this.expectFocusedName(focus);
    }
  }

  /** The grid holds `count` controls at `tabindex="0"`: one means the list is a single Tab stop. */
  public async expectListTabStops(count: number): Promise<void> {
    await expect(this.grid.locator('[tabindex="0"]')).toHaveCount(count);
  }

  /** The row's box lies inside the list's scrollport. */
  public async expectRowInView(name: string): Promise<void> {
    const check = this.page.getByRole('checkbox', { name: `Show ${name}`, exact: true });
    const row = this.grid.getByRole('row').filter({ has: check });

    await expect.poll(async (): Promise<boolean> => this.isInList(row)).toBe(true);
  }

  private async pressUntil(key: string, name: string): Promise<void> {
    for (let presses = 0; presses < MAX_TABS; presses += 1) {
      await this.page.keyboard.press(key);

      const focusedName = await this.focusedName();

      if (focusedName === name) return;
    }

    throw new Error(`graph e2e: ${name} was not reached in ${MAX_TABS} presses of ${key}`);
  }

  private async focusedName(): Promise<string> {
    const holders = await this.focused.count();

    if (holders === 0) return '';

    const snapshot = await this.focused.ariaSnapshot();
    const match = SNAPSHOT_NAME.exec(snapshot);

    return match?.[1] ?? '';
  }

  private async isInList(row: Locator): Promise<boolean> {
    const list = await this.grid.evaluate(readRect);
    const box = await row.evaluate(readRect);

    return isInside(box, list);
  }
}
