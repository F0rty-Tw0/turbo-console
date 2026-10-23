import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { EXPORT_LABEL } from '../../src/graph/common/graph.const.ts';
import { NEXT_FRAME } from '../common/graph.const.ts';
import type { ExportImageMessage, PngBounds, PngInfo } from '../common/graph.type.ts';
import { pngInfoOf } from '../test/utils/graph-png.spec.util.ts';
import { exportImagePosted, readPosted } from '../test/utils/graph-posted.spec.util.ts';

/** The message's image is a PNG and each side lies in `bounds`, ends included. */
const expectPngIn = (message: ExportImageMessage, bounds: PngBounds): void => {
  const info: PngInfo = pngInfoOf(message.png);

  expect(info.isPng).toBe(true);
  expect(info.width).toBeGreaterThanOrEqual(bounds.minWidth);
  expect(info.width).toBeLessThanOrEqual(bounds.maxWidth);
  expect(info.height).toBeGreaterThanOrEqual(bounds.minHeight);
  expect(info.height).toBeLessThanOrEqual(bounds.maxHeight);
};

/** The Export image button and the `exportImage` messages it posts to the host stub, read as PNG headers. */
export class GraphExport {
  public readonly button: Locator;

  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.button = page.getByRole('button', { name: EXPORT_LABEL, exact: true });
  }

  public async press(): Promise<void> {
    await this.button.click();
  }

  /** Clicks the button's spot even while it is disabled; a disabled button swallows the click. */
  public async pressDisabled(): Promise<void> {
    await this.button.click({ force: true });
  }

  /** Exactly one `exportImage` was posted; it is a PNG and each side lies in `bounds`, ends included. */
  public async expectOnePng(bounds: PngBounds): Promise<void> {
    await expect.poll(async (): Promise<number> => this.postedCount()).toBe(1);

    const messages = await this.messages();

    for (const message of messages) expectPngIn(message, bounds);
  }

  /** Two frames on, still no `exportImage` was posted. */
  public async expectNonePosted(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const count = await this.postedCount();

    expect(count).toBe(0);
  }

  private async postedCount(): Promise<number> {
    const messages = await this.messages();

    return messages.length;
  }

  private async messages(): Promise<ExportImageMessage[]> {
    const posted = await readPosted(this.page);

    return exportImagePosted(posted);
  }
}
