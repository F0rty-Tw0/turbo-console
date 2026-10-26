import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { GraphHover } from './graph-hover.po.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { PressPngs } from '../common/graph.type.ts';
import type { ScreenClip, ViewportPoint } from '../common/playwright.type.ts';
import { maxChannelDeltaOf } from '../test/utils/graph-press-delta.spec.util.ts';

/** Half the side, in px, of the square around the pointer that a press must leave unchanged. */
const PRESS_HALF_PX = 60;

/**
 * The largest channel change a press may leave: macOS CI moves a few anti-aliased link pixels by 1 level on a press,
 * while Cytoscape's press overlay moves a channel by 64 and its background circle by 38 (measured on Linux).
 */
const PRESS_NOISE_LEVELS = 4;

const cursorAt = ({ x, y }: ViewportPoint): string => {
  const element = document.elementFromPoint(x, y);

  if (element === null) return '';

  return getComputedStyle(element).cursor;
};

const attachPngs = async ({ before, during }: PressPngs): Promise<void> => {
  await test.info().attach('press-before', { body: Buffer.from(before, 'base64'), contentType: 'image/png' });
  await test.info().attach('press-during', { body: Buffer.from(during, 'base64'), contentType: 'image/png' });
};

/** `GraphHover`, plus what the page shows where the pointer rests: its cursor, and what a press there draws. */
export class GraphPointer extends GraphHover {
  private pressDelta: number | null;

  public constructor(page: Page) {
    super(page);
    this.pressDelta = null;
  }

  /**
   * Presses and releases the mouse where the pointer rests, keeping the largest channel change between a shot of the
   * square around it from before the press and one from while the button is held. Shots past the noise are attached.
   */
  public async press(): Promise<void> {
    const point = this.restingPoint();
    const clip = this.clipAround(point);

    await this.page.evaluate(NEXT_FRAME);

    const before = await this.page.screenshot({ clip });

    await this.page.mouse.down();

    try {
      await this.page.evaluate(NEXT_FRAME);

      const during = await this.page.screenshot({ clip });
      const pngs: PressPngs = { before: before.toString('base64'), during: during.toString('base64') };
      const delta = await this.page.evaluate(maxChannelDeltaOf, pngs);

      this.pressDelta = delta;

      if (delta > PRESS_NOISE_LEVELS) await attachPngs(pngs);
    } finally {
      await this.page.mouse.up();
    }
  }

  /** The last `press` moved no channel of any pixel within 60 px of the pointer past the noise; throws when none ran. */
  public expectPressDrewNothing(): void {
    const { pressDelta } = this;

    if (pressDelta === null) throw new Error('graph e2e: no press was recorded');

    expect(pressDelta).toBeLessThanOrEqual(PRESS_NOISE_LEVELS);
  }

  /** The element where the pointer rests shows `cursor`. */
  public async expectCursor(cursor: string): Promise<void> {
    const point = this.restingPoint();

    await expect.poll(async (): Promise<string> => this.page.evaluate(cursorAt, point)).toBe(cursor);
  }

  /** The graph container itself shows `cursor`. */
  public async expectContainerCursor(cursor: string): Promise<void> {
    await expect(this.container).toHaveCSS('cursor', cursor);
  }

  /** The graph container holds focus and draws no focus outline. */
  public async expectContainerFocusedWithoutRing(): Promise<void> {
    await expect(this.container).toBeFocused();
    await expect(this.container).toHaveCSS('outline-style', 'none');
  }

  /** The graph container draws its focus outline. */
  public async expectContainerRing(): Promise<void> {
    await expect(this.container).toHaveCSS('outline-style', 'solid');
  }

  private clipAround(point: ViewportPoint): ScreenClip {
    const size = this.page.viewportSize();
    const left = Math.max(0, point.x - PRESS_HALF_PX);
    const top = Math.max(0, point.y - PRESS_HALF_PX);
    const right = Math.min(size?.width ?? 0, point.x + PRESS_HALF_PX);
    const bottom = Math.min(size?.height ?? 0, point.y + PRESS_HALF_PX);
    const clip: ScreenClip = { x: left, y: top, width: right - left, height: bottom - top };

    return clip;
  }
}
