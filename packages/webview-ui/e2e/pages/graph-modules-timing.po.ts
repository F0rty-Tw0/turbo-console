import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { GraphTimings } from './graph-timings.po.ts';

/** Page times in ms: the mark just before the reply, and the first moment the page had a first frame measured. */
type FrameWindow = { readonly markedAt: number; readonly seenAt: number };

/**
 * In the page: stamps `performance.now()`, then checks once per animation frame until the first frame is measured and
 * stamps that moment, so `seenAt` trails the measured frame by about one frame.
 */
const frameWindowOf = async (): Promise<FrameWindow> => {
  const markedAt = performance.now();
  const nextFrame = async (): Promise<number> => {
    const frame = new Promise<number>((resolve): void => {
      requestAnimationFrame(resolve);
    });

    return frame;
  };
  const seenAtOf = async (): Promise<number> => {
    await nextFrame();

    const first = window.tcGraphProbe?.firstFrameMs() ?? null;

    if (first !== null) return performance.now();

    return seenAtOf();
  };
  const seenAt = await seenAtOf();
  const frameWindow: FrameWindow = { markedAt, seenAt };

  return frameWindow;
};

/**
 * Times the modules draw from the host's reply. A frame clock started at the reply measures at most the time from the
 * mark to the moment the frame was seen; one started earlier (or never, at 0) measures more and fails.
 */
export class GraphModulesTiming {
  private readonly page: Page;
  private readonly timings: GraphTimings;
  private frameWindow: Promise<FrameWindow> | null = null;

  public constructor(page: Page) {
    this.page = page;
    this.timings = new GraphTimings(page);
  }

  /**
   * Marks the page's clock just before the reply is posted and starts watching for the first frame. The watch is not
   * awaited here, `expectFrameFromAnswer` awaits it; the page runs evaluations in order, so the round trip after it
   * returns only once the mark is taken.
   */
  public async markAnswer(): Promise<void> {
    const watch = this.page.evaluate(frameWindowOf);

    this.frameWindow = watch;
    await this.page.evaluate((): number => performance.now());
  }

  /** The measured first frame fits between the mark and the moment it was seen, so the clock started at the reply or later. */
  public async expectFrameFromAnswer(): Promise<void> {
    const { frameWindow } = this;

    if (frameWindow === null) throw new Error('graph e2e: markAnswer() was not called before the reply');

    const measured = await this.timings.measuredFirstFrameMs();
    const { markedAt, seenAt } = await frameWindow;

    expect(measured).toBeLessThanOrEqual(seenAt - markedAt);
  }
}
