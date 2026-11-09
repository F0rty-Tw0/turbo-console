import { setTimeout as sleep } from 'node:timers/promises';

import type { Page } from '@playwright/test';
import { test } from '@playwright/test';

import type { ViewportSize } from '../common/playwright.type.ts';
import { boundedAnswer } from '../test/utils/bounded-answer.spec.util.ts';

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

/** How long one evaluate or nudge may go unanswered before the wait calls the page wedged: a busy renderer never answers. */
const ANSWER_BOUND_MS = 5000;

/** What the page reports of itself when the event is late, for the annotation or the error. */
const PAGE_STATE = `({ innerWidth, innerHeight, visibilityState: document.visibilityState, hasFocus: document.hasFocus() })`;

const SCREENSHOT_OPTIONS = { timeout: RESIZE_WAIT_MS };

type Nudge = readonly [string, (page: Page) => Promise<unknown>];

type NudgeOutcome = {
  readonly releasedBy: string | null;
  readonly tried: string[];
};

/** What may release a late `resize` event, in the order the wait tries them; each name says what it leaves behind. */
const NUDGES: Nudge[] = [
  ['layout', async (page: Page): Promise<unknown> => page.evaluate('document.documentElement.getBoundingClientRect().height')],
  ['mouse.move (leaves the pointer at (1,1))', async (page: Page): Promise<void> => page.mouse.move(1, 1)],
  ['bringToFront', async (page: Page): Promise<void> => page.bringToFront()],
  ['screenshot', async (page: Page): Promise<unknown> => page.screenshot(SCREENSHOT_OPTIONS)]
];

/** Waits for a page promise of a `resize` event, bounded by Node timers, and diagnoses one that is late (F-U8-8). */
export class ResizeWait {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits up to `RESIZE_WAIT_MS` for the page promise `promise` of a `resize` event. A late event gets nudges in turn: a
   * forced layout, a pointer move, bringing the page to front, a screenshot. One that releases it is recorded as an
   * `F-U8-8` annotation, also written to stderr since the list reporter prints no annotations, and the test goes on; when
   * none does, the wait throws with the page's state. A page that stops answering throws after `ANSWER_BOUND_MS`.
   */
  public async waitFor(promise: string, where: string, size: ViewportSize): Promise<void> {
    const startedAt = Date.now();
    const wanted = `${where} wanted ${JSON.stringify(size)}`;
    const arm = `window.__resizeSettled = false; ${promise}.then(() => { window.__resizeSettled = true; }); undefined`;

    await this.evaluate(arm, `${wanted}, arming the wait`);

    const isOnTime = await this.isSettledBy(startedAt + RESIZE_WAIT_MS, wanted);

    if (isOnTime) return;

    const state = await this.evaluate<unknown>(PAGE_STATE, `${wanted}, reading the page state`);
    const { releasedBy, tried } = await this.releasingNudge(wanted);
    const report = `${wanted} after ${Date.now() - startedAt} ms, page ${JSON.stringify(state)}; nudges: ${tried.join(', ')}`;

    if (releasedBy === null) throw new Error(`F-U8-8: no resize event, even after every nudge: ${report}`);

    const description = `released by ${releasedBy}: ${report}`;

    test.info().annotations.push({ type: 'F-U8-8', description });
    console.warn(`F-U8-8 ${description}`);
  }

  /** Tries each nudge in turn and names the first after which the event came, with what each tried nudge did. */
  private async releasingNudge(wanted: string): Promise<NudgeOutcome> {
    const tried: string[] = [];

    for (const [name, nudge] of NUDGES) {
      const note = await this.triedNudge(name, nudge, wanted);

      tried.push(note);

      const isReleased = await this.isSettledBy(Date.now() + NUDGE_WAIT_MS, wanted);
      const outcome = { releasedBy: name, tried };

      if (isReleased) return outcome;
    }

    const outcome = { releasedBy: null, tried };

    return outcome;
  }

  /** Runs one nudge and returns its name, or `<name> threw: <message>`, so a throwing nudge does not end the diagnosis. */
  private async triedNudge(name: string, nudge: Nudge[1], wanted: string): Promise<string> {
    try {
      const message = `F-U8-8: page stopped answering ${name} after ${ANSWER_BOUND_MS} ms: ${wanted}`;

      const nudging = nudge(this.page);

      await boundedAnswer(nudging, ANSWER_BOUND_MS, message);

      return name;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'a non-Error value';
      const [firstLine] = message.split('\n');

      return `${name} threw: ${firstLine}`;
    }
  }

  /** Polls the page with Node timers until the awaited `resize` promise settled or `deadline` (epoch ms) passed. */
  private async isSettledBy(deadline: number, wanted: string): Promise<boolean> {
    const context = `${wanted}, asking whether it came`;
    const readSettled = async (): Promise<boolean> => this.evaluate<boolean>('window.__resizeSettled === true', context);
    let isSettled = await readSettled();

    while (!isSettled && Date.now() < deadline) {
      await sleep(RESIZE_POLL_MS);
      isSettled = await readSettled();
    }

    return isSettled;
  }

  private async evaluate<T>(expression: string, context: string): Promise<T> {
    const answering = this.page.evaluate<T>(expression);
    const message = `F-U8-8: page stopped answering evaluate after ${ANSWER_BOUND_MS} ms: ${context}`;

    return boundedAnswer(answering, ANSWER_BOUND_MS, message);
  }
}
