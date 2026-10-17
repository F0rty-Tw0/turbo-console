import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { HostMessage } from '../../src/bridge/common/details-message.type.ts';
import type { RunView } from '../../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../../src/details/common/details-page.type.ts';

/** Dispatches the message event and clicks the focused control in one task, so both land in the same frame. */
const deliverAndClickFocused = (message: HostMessage): void => {
  const event = new MessageEvent('message', { data: message });

  dispatchEvent(event);

  const focused = document.activeElement;

  if (focused instanceof HTMLElement) focused.click();
};

const expectTextOnly = async (value: Locator): Promise<void> => {
  await expect(value.locator('.codicon')).toHaveCount(0);
  await expect(value).not.toHaveClass(/field-icon-value/);
};

const expectLogo = async (value: Locator, iconId: string, title: string): Promise<void> => {
  const countNodes = (cell: HTMLElement): number => cell.childNodes.length;
  const nodeCount = await value.evaluate(countNodes);

  await expect(value).toHaveClass('field-icon-value');
  expect(nodeCount).toBe(2);
  await expect(value.locator('> :first-child')).toHaveClass(`codicon codicon-${iconId}`);
  await expect(value.locator('> span:not(.codicon)')).toHaveText(title);
};

/** One task card, found by its exact title text, never by a selector built from the name. */
export class TaskCardSection {
  public readonly title: Locator;
  public readonly runButton: Locator;
  public readonly copyButton: Locator;
  public readonly status: Locator;

  private readonly root: Locator;
  private readonly statusIcon: Locator;

  public constructor(page: Page, taskName: string) {
    const heading = page.getByRole('heading', { level: 3, name: taskName, exact: true });

    this.root = page.locator('section.card').filter({ has: heading });
    this.title = this.root.locator('.card-title');
    this.runButton = this.root.locator('.run-slot button');
    this.copyButton = this.root.locator('.card-actions > button');
    this.status = this.root.locator('.run-status');
    this.statusIcon = this.status.locator('.codicon');
  }

  /** Puts Enter down on the focused control and keeps it held. */
  public async holdEnter(): Promise<void> {
    await this.root.page().keyboard.down('Enter');
  }

  /** Presses and releases Enter on the focused control, which a button turns into a click with `detail` 0. */
  public async pressEnter(): Promise<void> {
    await this.root.page().keyboard.press('Enter');
  }

  /** Puts the held Enter down again, which Playwright sends as a repeat (`event.repeat` true). */
  public async repeatEnter(): Promise<void> {
    await this.root.page().keyboard.down('Enter');
  }

  /** Delivers this card's runState, then clicks the focused control before the page can paint a frame. */
  public async sendRunStateAndClickFocused(taskId: string, run: RunView): Promise<void> {
    const message: HostMessage = { type: 'runState', taskId, run };

    await this.root.page().evaluate(deliverAndClickFocused, message);
  }

  /** The value of field `term` as rendered, line breaks included, unlike `toHaveText`, which collapses whitespace. */
  public async expectRenderedField(term: string, renderedText: string): Promise<void> {
    const value = this.root.getByText(term, { exact: true }).locator('+ dd');

    await expect(value).toHaveJSProperty('innerText', renderedText);
  }

  public async expectFields(rows: FieldRow[]): Promise<void> {
    const terms = rows.map(([term]: FieldRow): string => term);
    const values = rows.map(([, value]: FieldRow): string => value);

    await expect(this.root.locator('dt')).toHaveText(terms);
    await expect(this.root.locator('dd')).toHaveText(values);
  }

  /**
   * The `Tool` value: its text; with an icon id, a `field-icon-value` cell of exactly two nodes (the codicon span, then the text span);
   * without one, no codicon and no `field-icon-value` class.
   */
  public async expectToolField(title: string, iconId: string | null): Promise<void> {
    const value = this.root.locator('dt', { hasText: /^Tool$/ }).locator('+ dd');

    await expect(value).toHaveText(title);

    if (iconId === null) return expectTextOnly(value);

    await expectLogo(value, iconId, title);
  }

  public async expectBadges(labels: string[]): Promise<void> {
    await expect(this.root.locator('.badge')).toHaveText(labels);
  }

  /** Every item of the badge row, badges and notes alike, in order. */
  public async expectBadgeRow(texts: string[]): Promise<void> {
    await expect(this.root.locator('.badges > li')).toHaveText(texts);
  }

  public async expectRunButtonUnfocused(): Promise<void> {
    await expect(this.runButton).not.toBeFocused();
  }

  /** The status line has no icon and no text. */
  public async expectBlankStatus(): Promise<void> {
    await expect(this.status.locator('*')).toHaveCount(0);
    await expect(this.status).toHaveText('');
  }

  public async expectIconAnimation(animationName: string): Promise<void> {
    const readAnimation = (icon: HTMLElement | SVGElement): string => getComputedStyle(icon).animationName;
    const computedAnimation = async (): Promise<string> => this.statusIcon.evaluate(readAnimation);

    await expect.poll(computedAnimation).toBe(animationName);
  }

  /** The status icon has exactly `className` and the inline `color` (empty for none). */
  public async expectStatusIcon(className: string, color: string): Promise<void> {
    const readColor = (icon: HTMLElement | SVGElement): string => icon.style.color;
    const inlineColor = async (): Promise<string> => this.statusIcon.evaluate(readColor);

    await expect(this.statusIcon).toHaveAttribute('class', className);
    await expect.poll(inlineColor).toBe(color);
  }
}
