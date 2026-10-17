import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ViewportPoint } from '../common/playwright.type.ts';

/** Reads the aria-label of the button under `point`, or `null` when no button is there. */
const buttonLabelAt = ({ x, y }: ViewportPoint): string | null => {
  const button = document.elementFromPoint(x, y)?.closest('button');

  return button?.getAttribute('aria-label') ?? null;
};

/** The page's viewport, and a spot in it that a later click lands on whatever moved there. */
export class PageViewport {
  private readonly page: Page;
  private spot: ViewportPoint | null;

  public constructor(page: Page) {
    this.page = page;
    this.spot = null;
  }

  /** Resizes the page, as VS Code does when it opens or closes the panel under the editor. */
  public async resize(width: number, height: number): Promise<void> {
    const size = { width, height };

    await this.page.setViewportSize(size);
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

  public async expectButtonAtSpot(label: string): Promise<void> {
    const labelAt = await this.page.evaluate(buttonLabelAt, this.rememberedSpot());

    expect(labelAt).toBe(label);
  }

  private rememberedSpot(): ViewportPoint {
    if (this.spot === null) throw new Error('rememberSpotOf must run first');

    return this.spot;
  }
}
