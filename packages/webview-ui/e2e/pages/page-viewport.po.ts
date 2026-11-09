import { setTimeout as sleep } from 'node:timers/promises';

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

import type { ViewportPoint, ViewportSize } from '../common/playwright.type.ts';

/**
 * How long a wait for the page's `resize` event polls before it nudges the page (F-U8-8): the event comes in the next
 * frame, yet on a loaded macOS runner it twice never came and the test hung to its timeout. Node timers measure it,
 * since the specs pause the page's own clock.
 */
const RESIZE_WAIT_MS = 5000;

/** How often the wait asks the page whether the event came. */
const RESIZE_POLL_MS = 100;

/** How long the wait gives each nudge to release the event before it tries the next. */
const NUDGE_WAIT_MS = 500;

/** What the page reports of itself when the event is late, for the annotation or the error. */
const PAGE_STATE = `({ innerWidth, innerHeight, visibilityState: document.visibilityState, hasFocus: document.hasFocus() })`;

/** Reads the aria-label of the button under `point`, or `null` when no button is there. */
const buttonLabelAt = ({ x, y }: ViewportPoint): string | null => {
  const button = document.elementFromPoint(x, y)?.closest('button');

  return button?.getAttribute('aria-label') ?? null;
};

/** Stores a promise of the page's next `resize` event as `window.__resized`. */
const ARM_RESIZE_WAIT = `window.__resized = new Promise((resolve) =>
  addEventListener('resize', resolve, { once: true })); undefined`;

/**
 * Registered before the page's scripts, so it runs before their `resize` listeners: once `window.__catchResize` is
 * set, it keeps every `resize` event from them and resolves `window.__resizeCaught`.
 */
const RESIZE_CATCHER = `addEventListener('resize', (event) => {
  if (window.__catchResize === undefined) return;
  event.stopImmediatePropagation();
  window.__catchResize();
}, true);`;

/** Arms the catcher and stores a promise of the next caught `resize` event as `window.__resizeCaught`. */
const ARM_RESIZE_CATCH = `window.__resizeCaught = new Promise((resolve) => {
  window.__catchResize = resolve;
}); undefined`;

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
    await this.waitForResize('window.__resized', 'resize', size);
  }

  /** Before the page loads: lets `resizeUnseenAndClickSpot` keep a `resize` event from the page's own listeners. */
  public async installResizeCatcher(): Promise<void> {
    await this.page.addInitScript({ content: RESIZE_CATCHER });
  }

  /**
   * Resizes the page, keeps its `resize` event from the page's own listeners, then clicks the remembered spot: the
   * click lands on the new layout before the page has seen a `resize` event, as one that beats the next frame does.
   * Needs `installResizeCatcher` before the page loads.
   */
  public async resizeUnseenAndClickSpot(width: number, height: number): Promise<void> {
    const size = { width, height };
    const { x, y } = this.rememberedSpot();

    await this.page.evaluate(ARM_RESIZE_CATCH);
    await this.page.setViewportSize(size);
    await this.waitForResize('window.__resizeCaught', 'resizeUnseenAndClickSpot', size);
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

  /**
   * Waits up to `RESIZE_WAIT_MS` for the page promise `promise` of a `resize` event. A late event (F-U8-8) gets nudges
   * in turn: a forced layout, a pointer move, bringing the page to front, a screenshot. One that releases it is recorded
   * as an `F-U8-8` annotation and the test goes on; when none does, the wait throws with the page's state.
   */
  private async waitForResize(promise: string, where: string, size: ViewportSize): Promise<void> {
    const startedAt = Date.now();

    await this.page.evaluate(`window.__resizeSettled = false; ${promise}.then(() => { window.__resizeSettled = true; }); undefined`);

    const isOnTime = await this.isResizeSettledBy(startedAt + RESIZE_WAIT_MS);

    if (isOnTime) return;

    const state = await this.page.evaluate<unknown>(PAGE_STATE);
    const releasedBy = await this.releasingNudge();
    const report = `${where} wanted ${JSON.stringify(size)} after ${Date.now() - startedAt} ms, page ${JSON.stringify(state)}`;

    if (releasedBy === null) throw new Error(`F-U8-8: no resize event, even after every nudge: ${report}`);

    test.info().annotations.push({ type: 'F-U8-8', description: `released by ${releasedBy}: ${report}` });
  }

  /** Tries each nudge in turn and names the first after which the event came, or `null` when none released it. */
  private async releasingNudge(): Promise<string | null> {
    const screenshotOptions = { timeout: RESIZE_WAIT_MS };
    const nudges: [string, () => Promise<unknown>][] = [
      ['layout', async (): Promise<unknown> => this.page.evaluate('document.documentElement.getBoundingClientRect().height')],
      ['mouse.move', async (): Promise<void> => this.page.mouse.move(1, 1)],
      ['bringToFront', async (): Promise<void> => this.page.bringToFront()],
      ['screenshot', async (): Promise<unknown> => this.page.screenshot(screenshotOptions)]
    ];

    for (const [name, nudge] of nudges) {
      await nudge();

      const deadline = Date.now() + NUDGE_WAIT_MS;
      const isReleased = await this.isResizeSettledBy(deadline);

      if (isReleased) return name;
    }

    return null;
  }

  /** Polls the page with Node timers until the awaited `resize` promise settled or `deadline` (epoch ms) passed. */
  private async isResizeSettledBy(deadline: number): Promise<boolean> {
    const readSettled = async (): Promise<boolean> => this.page.evaluate<boolean>('window.__resizeSettled === true');
    let isSettled = await readSettled();

    while (!isSettled && Date.now() < deadline) {
      await sleep(RESIZE_POLL_MS);
      isSettled = await readSettled();
    }

    return isSettled;
  }

  private rememberedSpot(): ViewportPoint {
    if (this.spot === null) throw new Error('rememberSpotOf must run first');

    return this.spot;
  }
}
