import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { CardLayout } from './card-layout.po.ts';
import type { ElementRect } from '../common/playwright.type.ts';
import { readRect } from '../test/utils/element-rect.spec.util.ts';

type ThemeVars = Record<string, string>;

type BorderSide = 'top' | 'bottom';

/** Runs in the page: sets each variable on the root element, where VS Code puts its theme variables. */
const setRootVars = (vars: ThemeVars): void => {
  const rootStyle = document.documentElement.style;

  for (const [name, value] of Object.entries(vars)) rootStyle.setProperty(name, value);
};

const readFontFamily = (element: Element): string => getComputedStyle(element).fontFamily;

const readBorderWidth = (element: Element, side: BorderSide): string =>
  getComputedStyle(element).getPropertyValue(`border-${side}-width`);

const topOf = (rect: ElementRect): number => rect.top;

const CODICON_STATUS = `[...document.fonts].find((face) => face.family.replaceAll('"', '') === 'codicon')?.status`;

/** The page's theme and the layout of its cards and buttons, read from computed styles and boxes. */
export class PageLayout {
  private readonly page: Page;
  private readonly body: Locator;
  private readonly cards: Locator;
  private rememberedRects: ElementRect[] | null;

  public constructor(page: Page) {
    this.page = page;
    this.body = page.locator('body');
    this.cards = page.locator('section.card');
    this.rememberedRects = null;
  }

  public card(taskName: string): CardLayout {
    const card = new CardLayout(this.page, taskName);

    return card;
  }

  /**
   * After the page loads: stands in for the theme, since the harness defines no `--vscode-*` variable. It goes through
   * `style.setProperty`, never a `<style>` tag, which the webview CSP would block.
   */
  public async setThemeVars(vars: ThemeVars): Promise<void> {
    await this.page.evaluate(setRootVars, vars);
  }

  /** The body's computed `font-family` contains `family` and not `otherFamily`. */
  public async expectBodyFont(family: string, otherFamily: string): Promise<void> {
    const fontFamily = await this.body.evaluate(readFontFamily);

    expect(fontFamily).toContain(family);
    expect(fontFamily).not.toContain(otherFamily);
  }

  /** The first `selector` element's computed `side` border width is `width`. */
  public async expectBorderWidth(selector: string, side: BorderSide, width: string): Promise<void> {
    const element = this.page.locator(selector).first();
    const borderWidth = await element.evaluate(readBorderWidth, side);

    expect(borderWidth).toBe(width);
  }

  /** The first two cards share a row: the same `top`, a different `left`. */
  public async expectCardsSideBySide(): Promise<void> {
    const [first, second] = await this.cardRects();

    expect(second?.top).toBe(first?.top);
    expect(second?.left).not.toBe(first?.left);
  }

  /** Every card has a row of its own: no two cards share a `top`. */
  public async expectCardsStacked(): Promise<void> {
    const rects = await this.cardRects();
    const tops = new Set(rects.map(topOf));

    expect(rects.length).toBeGreaterThan(1);
    expect(tops.size).toBe(rects.length);
  }

  /** Remembers every card's box as it is now. */
  public async rememberCardRects(): Promise<void> {
    this.rememberedRects = await this.cardRects();
  }

  /** Every card keeps the box `rememberCardRects` measured: the same `top`, `left`, `width` and `height`. */
  public async expectCardRectsKept(): Promise<void> {
    const rects = await this.cardRects();

    expect(this.rememberedRects).not.toBeNull();
    expect(rects).toEqual(this.rememberedRects);
  }

  public async expectCodiconFontLoading(): Promise<void> {
    const readStatus = async (): Promise<unknown> => this.page.evaluate<unknown>(CODICON_STATUS);

    await expect.poll(readStatus).toBe('loading');
  }

  /** The button labelled `label` is at least `size` × `size` CSS pixels. */
  public async expectHitArea(label: string, size: number): Promise<void> {
    const button = this.page.getByRole('button', { name: label, exact: true });
    const { width, height } = await button.evaluate(readRect);

    expect(width).toBeGreaterThanOrEqual(size);
    expect(height).toBeGreaterThanOrEqual(size);
  }

  private async cardRects(): Promise<ElementRect[]> {
    const cards = await this.cards.all();
    const reads = cards.map(async (card: Locator): Promise<ElementRect> => card.evaluate(readRect));
    const rects = await Promise.all(reads);

    return rects;
  }
}
