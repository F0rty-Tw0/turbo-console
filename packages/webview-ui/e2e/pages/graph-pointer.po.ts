import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphHover } from './graph-hover.po.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ScreenClip, ViewportPoint } from '../common/playwright.type.ts';

/** Half the side, in px, of the square around the pointer that a press must leave unchanged. */
const PRESS_HALF_PX = 60;

/** The shot around the pointer before a press and while its button is held. */
type PressShots = {
  readonly before: Buffer;
  readonly during: Buffer;
};

const cursorAt = ({ x, y }: ViewportPoint): string => {
  const element = document.elementFromPoint(x, y);

  if (element === null) return '';

  return getComputedStyle(element).cursor;
};

/** `GraphHover`, plus what the page shows where the pointer rests: its cursor, and what a press there draws. */
export class GraphPointer extends GraphHover {
  private shots: PressShots | null;

  public constructor(page: Page) {
    super(page);
    this.shots = null;
  }

  /**
   * Presses and releases the mouse where the pointer rests, keeping a shot of the square around it from before the
   * press and from while the button is held.
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
      const shots: PressShots = { before, during };

      this.shots = shots;
    } finally {
      await this.page.mouse.up();
    }
  }

  /** The last `press` changed no pixel within 60 px of the pointer; throws when none ran. */
  public expectPressDrewNothing(): void {
    const { shots } = this;

    if (shots === null) throw new Error('graph e2e: no press was recorded');

    const isUnchanged = shots.during.equals(shots.before);

    expect(isUnchanged).toBe(true);
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
