import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { HostMessage } from '../../src/bridge/common/details-message.type.ts';
import type { RunView } from '../../src/bridge/common/details-state.type.ts';
import { factValueOf } from '../test/utils/card-fact.spec.util.ts';

/** Dispatches the message event and clicks the focused control in one task, so both land in the same frame. */
const deliverAndClickFocused = (message: HostMessage): void => {
  const event = new MessageEvent('message', { data: message });

  dispatchEvent(event);

  const focused = document.activeElement;

  if (focused instanceof HTMLElement) focused.click();
};

const countNodes = (element: HTMLElement): number => element.childNodes.length;

const firstNodeType = (element: HTMLElement): number => element.childNodes[0]?.nodeType ?? 0;

const TEXT_NODE = 3;

const NOT_EMPTY_OR_CODE = /^(?!.*\b(empty|code)\b)/u;

const expectTextChip = async (chip: Locator, title: string): Promise<void> => {
  const nodeCount = await chip.evaluate(countNodes);
  const nodeType = await chip.evaluate(firstNodeType);

  await expect(chip).toHaveAttribute('class', 'chip chip-tool');
  await expect(chip).toHaveText(title);
  expect(nodeCount).toBe(1);
  expect(nodeType).toBe(TEXT_NODE);
};

const expectLogoChip = async (chip: Locator, iconId: string, title: string): Promise<void> => {
  const nodeCount = await chip.evaluate(countNodes);

  await expect(chip).toHaveAttribute('class', 'chip chip-tool chip-icon');
  expect(nodeCount).toBe(2);
  await expect(chip.locator('> :first-child')).toHaveClass(`codicon codicon-${iconId}`);
  await expect(chip.locator('> span:not(.codicon)')).toHaveText(title);
};

const expectListFact = async (value: Locator, entries: string[]): Promise<void> => {
  await expect(value.locator('> ul.tokens > li')).toHaveCount(entries.length);
  await expect(value.locator('> ul.tokens > li > code')).toHaveText(entries);
  await expect(value).toHaveText(entries.join(''));
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
    this.copyButton = this.root.getByRole('button', { name: /^Copy command/ });
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
    const value = factValueOf(this.root, term);

    await expect(value).toHaveJSProperty('innerText', renderedText);
  }

  /** The labelled command block (`role=group`), found by its exact accessible name. */
  public commandBlock(label: string): Locator {
    const block = this.root.getByRole('group', { name: label, exact: true });

    return block;
  }

  public async expectNoCommandBlock(): Promise<void> {
    await expect(this.root.locator('.command')).toHaveCount(0);
  }

  /** The `dt` texts, in order; a value is checked with `expectFact`. */
  public async expectFields(terms: string[]): Promise<void> {
    await expect(this.root.locator('dt')).toHaveText(terms);
  }

  /** The header's children, in order, by their exact class. */
  public async expectHeaderOrder(classNames: string[]): Promise<void> {
    await expect(this.root.locator('header.card-header > *')).toHaveClass(classNames);
  }

  /** Every chip, in order; no chips means no `ul.chips` at all. */
  public async expectChips(texts: string[]): Promise<void> {
    await expect(this.root.locator('.chips > li')).toHaveText(texts);
  }

  /**
   * The Tool chip: with an icon id, `li.chip.chip-tool.chip-icon` of exactly two nodes (the codicon span, then the title span);
   * without one, `li.chip.chip-tool` of one text node.
   */
  public async expectToolChip(title: string, iconId: string | null): Promise<void> {
    const chip = this.root.locator('.chips > li.chip-tool');

    if (iconId === null) return expectTextChip(chip, title);

    await expectLogoChip(chip, iconId, title);
  }

  public expectFact(term: string, kind: 'plain' | 'code' | 'empty', text: string): Promise<void>;
  public expectFact(term: string, kind: 'list', entries: string[]): Promise<void>;
  /** The value of fact `term`: its kind (class `code`, class `empty`, neither, or a token list) and its text. */
  public async expectFact(term: string, kind: 'plain' | 'code' | 'empty' | 'list', content: string | string[]): Promise<void> {
    const value = factValueOf(this.root, term);

    if (typeof content !== 'string') return expectListFact(value, content);

    await expect(value).toHaveText(content);
    await expect(value.locator('ul')).toHaveCount(0);

    if (kind === 'plain') return expect(value).toHaveClass(NOT_EMPTY_OR_CODE);

    await expect(value).toHaveClass(kind);
  }

  /** The description paragraph shows `text`; `null` means there is none. */
  public async expectDescription(text: string | null): Promise<void> {
    const description = this.root.locator('p.card-description');

    if (text === null) return expect(description).toHaveCount(0);

    await expect(description).toHaveText(text);
  }

  public async expectRunButtonUnfocused(): Promise<void> {
    await expect(this.runButton).not.toBeFocused();
  }

  /** The status line has no icon and no text. */
  public async expectBlankStatus(): Promise<void> {
    await expect(this.status.locator('*')).toHaveCount(0);
    await expect(this.status).toHaveText('');
  }

  /** The card's `--status-color` is `var(<varName>)`; `null` means the property is unset. */
  public async expectStatusColor(varName: string | null): Promise<void> {
    const readColor = (card: HTMLElement): string => card.style.getPropertyValue('--status-color');
    const statusColor = async (): Promise<string> => this.root.evaluate(readColor);
    const expected = varName === null ? '' : `var(${varName})`;

    await expect.poll(statusColor).toBe(expected);
  }

  /** The button found by its exact accessible name shows `text` as its visible text. */
  public async expectButtonText(name: string, text: string): Promise<void> {
    const button = this.root.getByRole('button', { name, exact: true });

    await expect(button).toHaveJSProperty('innerText', text);
  }

  /** The run text reads `text` and carries the same text as its tooltip. */
  public async expectRunTextTooltip(text: string): Promise<void> {
    const runText = this.status.locator('.run-text');

    await expect(runText).toHaveJSProperty('innerText', text);
    await expect(runText).toHaveAttribute('title', text);
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
