import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ViewportPoint } from '../common/playwright.type.ts';

/** Reads the aria-label of the button under `point`, or `null` when no button is there. */
const buttonLabelAt = ({ x, y }: ViewportPoint): string | null => {
  const button = document.elementFromPoint(x, y)?.closest('button');

  return button?.getAttribute('aria-label') ?? null;
};

/** Stores a promise of the page's next `resize` event as `window.__resized`. */
const ARM_RESIZE_WAIT = `window.__resized = new Promise((resolve) =>
  addEventListener('resize', resolve, { once: true })); undefined`;

/** The page's viewport, and a spot in it that a later click lands on whatever moved there. */
export class PageViewport {
  private readonly page: Page;
  private spot: ViewportPoint | null;

  public constructor(page: Page) {
    this.page = page;
    this.spot = null;
  }

  /**
   * Resizes the page, as VS Code does when it opens or closes the panel under the editor, and waits for its `resize`
   * event: the page gets it in the next frame, before the user can see the new layout, while a click Playwright sends
   * right away can beat that frame. The current size changes nothing and fires no `resize` event, so nothing is awaited.
   */
  public async resize(width: number, height: number): Promise<void> {
    const size = { width, height };
    const current = this.page.viewportSize();
    const isSameSize = current?.width === width && current.height === height;

    if (isSameSize) return;

    await this.page.evaluate(ARM_RESIZE_WAIT);
    await this.page.setViewportSize(size);
    await this.page.evaluate('window.__resized');
  }

  /**
   * Resizes the page and clicks the remembered spot at once, without waiting for the `resize` event: the click usually
   * lands on the new layout before the next frame fires that event.
   */
  public async resizeAndClickSpot(width: number, height: number): Promise<void> {
    const size = { width, height };
    const { x, y } = this.rememberedSpot();

    await this.page.setViewportSize(size);
    await this.page.mouse.click(x, y);
  }

  /** Remembers the centre of the button labelled `label` as it sits now. */
  public async rememberSpotOf(label: string): Promise<void> {
    const box = await this.page.getByRole('button', { name: label, exact: true }).boundingBox();

    if (box === null) throw new Error(`no visible button ${label}`);

    this.spot = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  public async clickSpot(): Promise<void> {
    const { x, y } = this.rememberedSpot();

    await this.page.mouse.click(x, y);
  }

  /** Polls, since a posted host message renders in a later task than the post. */
  public async expectButtonAtSpot(label: string): Promise<void> {
    const spot = this.rememberedSpot();
    const readLabelAt = async (): Promise<string | null> => this.page.evaluate(buttonLabelAt, spot);

    await expect.poll(readLabelAt).toBe(label);
  }

  private rememberedSpot(): ViewportPoint {
    if (this.spot === null) throw new Error('rememberSpotOf must run first');

    return this.spot;
  }
}
