import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ElementRect, FactPlacement } from '../common/playwright.type.ts';
import { factTermOf, factValueOf } from '../test/utils/card-fact.spec.util.ts';
import { isInside, overlaps, readRect } from '../test/utils/element-rect.spec.util.ts';

/** Where code shows on a card: the command block, a Script fact's body, or a list fact's token. */
type CodePart = 'command' | 'script' | 'token';

const placementOf = (termRect: ElementRect, valueRect: ElementRect): FactPlacement => {
  if (valueRect.top > termRect.top) return 'below';

  return 'beside';
};

const readFontFamily = (element: Element): string => getComputedStyle(element).fontFamily;

const readOutline = (element: Element): string => {
  const { outlineStyle, outlineColor } = getComputedStyle(element);

  return `${outlineStyle} ${outlineColor}`;
};

const readOverflow = (element: Element): number => element.scrollWidth - element.clientWidth;

/** One line of the element's own `line-height`, measured with a `1lh` probe that is removed again. */
const readLineHeight = (element: Element): number => {
  const probe = document.createElement('div');

  probe.style.height = '1lh';
  element.append(probe);

  const { height } = probe.getBoundingClientRect();

  probe.remove();

  return height;
};

const readTopBorderColor = (element: Element): string => getComputedStyle(element).borderTopColor;

const readStartBorder = (element: Element): string => {
  const { borderInlineStartWidth, borderInlineStartColor } = getComputedStyle(element);

  return `${borderInlineStartWidth} ${borderInlineStartColor}`;
};

/** One task card's computed layout and styles, found by its exact title text like `TaskCardSection`. */
export class CardLayout {
  private readonly root: Locator;
  private readonly runButton: Locator;
  private readonly statusIcon: Locator;
  private readonly runStatus: Locator;
  private readonly runText: Locator;
  private readonly commandText: Locator;
  private readonly scriptValue: Locator;
  private readonly token: Locator;
  private runWidth: number | null;

  public constructor(page: Page, taskName: string) {
    const heading = page.getByRole('heading', { level: 3, name: taskName, exact: true });

    this.root = page.locator('section.card').filter({ has: heading });
    this.runButton = this.root.locator('.run-slot button');
    this.statusIcon = this.root.locator('.run-status .codicon');
    this.runStatus = this.root.locator('.run-status');
    this.runText = this.root.locator('.run-status .run-text');
    this.commandText = this.root.locator('.command pre');
    this.scriptValue = this.root.locator('dd.code');
    this.token = this.root.locator('.tokens code').first();
    this.runWidth = null;
  }

  public async hoverRunButton(): Promise<void> {
    await this.runButton.hover();
  }

  /** Remembers the Run/Stop button's width as it is now. */
  public async rememberRunWidth(): Promise<void> {
    const { width } = await this.runButton.evaluate(readRect);

    this.runWidth = width;
  }

  /** The Run/Stop button now in the slot is as wide as the one `rememberRunWidth` measured. */
  public async expectRunWidthKept(): Promise<void> {
    const { width } = await this.runButton.evaluate(readRect);

    expect(this.runWidth).not.toBeNull();
    expect(width).toBe(this.runWidth);
  }

  /** The computed `font-family` of the code part contains `family`. */
  public async expectCodeFont(part: CodePart, family: string): Promise<void> {
    const code = this.codePart(part);
    const fontFamily = await code.evaluate(readFontFamily);

    expect(fontFamily).toContain(family);
  }

  /** Fact `term`'s value sits beside its term (same `top`) or below it (greater `top`). */
  public async expectFactPlacement(term: string, placement: FactPlacement): Promise<void> {
    const termCell = factTermOf(this.root, term);
    const termRect = await termCell.evaluate(readRect);
    const valueCell = factValueOf(this.root, term);
    const valueRect = await valueCell.evaluate(readRect);
    const placed = placementOf(termRect, valueRect);

    expect(placed).toBe(placement);
  }

  /**
   * The status icon shows inside the card, and the run text has room. The status has its own row, so the overlap check
   * can no longer fail on layout alone; it stays as a guard against a layout that puts the status back beside the button.
   */
  public async expectStatusClearOfRunButton(): Promise<void> {
    const cardRect = await this.root.evaluate(readRect);
    const iconRect = await this.statusIcon.evaluate(readRect);
    const buttonRect = await this.runButton.evaluate(readRect);
    const textRect = await this.runText.evaluate(readRect);
    const isInCard = isInside(iconRect, cardRect);
    const isUnderButton = overlaps(iconRect, buttonRect);

    expect(iconRect.width).toBeGreaterThan(0);
    expect(isInCard).toBe(true);
    expect(isUnderButton).toBe(false);
    expect(textRect.width).toBeGreaterThan(0);
  }

  /** The Run/Stop button's computed outline, as `<style> <color>`. */
  public async expectRunOutline(style: string, color: string): Promise<void> {
    const outline = await this.runButton.evaluate(readOutline);

    expect(outline).toBe(`${style} ${color}`);
  }

  /** The command block's computed outline, as `<style> <color>`. */
  public async expectCommandOutline(style: string, color: string): Promise<void> {
    const outline = await this.commandText.evaluate(readOutline);

    expect(outline).toBe(`${style} ${color}`);
  }

  /** A list token's computed outline, as `<style> <color>`. */
  public async expectTokenOutline(style: string, color: string): Promise<void> {
    const outline = await this.token.evaluate(readOutline);

    expect(outline).toBe(`${style} ${color}`);
  }

  /** The run text is cut off: its content is wider than its box, so it truncates instead of wrapping. */
  public async expectRunTextTruncated(): Promise<void> {
    const overflow = await this.runText.evaluate(readOverflow);

    expect(overflow).toBeGreaterThan(0);
  }

  /** The status line is one line tall (`max(1lh, 16px)`) and holds the run text on one line. */
  public async expectStatusOneLine(): Promise<void> {
    const statusRect = await this.runStatus.evaluate(readRect);
    const textRect = await this.runText.evaluate(readRect);
    const lineHeight = await this.runStatus.evaluate(readLineHeight);

    expect(statusRect.height).toBeCloseTo(Math.max(lineHeight, 16), 1);
    expect(textRect.height).toBeLessThanOrEqual(statusRect.height);
  }

  /** The card frame's top edge has `color`; the start edge carries the status colour instead. */
  public async expectFrameColor(color: string): Promise<void> {
    const borderColor = await this.root.evaluate(readTopBorderColor);

    expect(borderColor).toBe(color);
  }

  /** The card's start edge, as `<width> <color>`; polled, since a runState renders in a later task than its post. */
  public async expectStartBorder(width: string, color: string): Promise<void> {
    const startBorder = async (): Promise<string> => this.root.evaluate(readStartBorder);

    await expect.poll(startBorder).toBe(`${width} ${color}`);
  }

  private codePart(part: CodePart): Locator {
    if (part === 'command') return this.commandText;

    if (part === 'script') return this.scriptValue;

    return this.token;
  }
}
