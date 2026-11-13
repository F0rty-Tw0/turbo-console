import type { Page, Request } from '@playwright/test';
import { errors, test } from '@playwright/test';

import type { NavigationWait, RouteHandler } from '../common/playwright.type.ts';
import { SHELL_ORIGIN, SHELL_URL } from '../common/shell.const.ts';

/**
 * How long one navigation to the shell may take before it counts as stuck (C84): on a macOS runner the routed
 * `index.html` request twice never completed, so `goto` sat out the test timeout with zero network entries in the trace.
 * A local load takes well under a second. The retry gets the same bound and the clear its own short one, so a second
 * stuck try still throws the diagnosis inside the test timeout (10 + 2 + 10 s of 30) instead of running into it.
 */
const SHELL_GOTO_MS = 10_000;

/**
 * Where the retry goes first: a timed-out `goto` leaves its held `index.html` request pending. Going to a blank page makes
 * Chromium abort it there, so its `requestfailed` lands before the retry resets the counters, not in the retry's diagnosis.
 */
const CLEAR_PAGE = 'about:blank';

/** The clear's own bound: a blank page loads at once, so a clear slower than this means the frame is wedged. */
const CLEAR_MS = 2000;

/** The ways a stuck navigation ends: a timeout, or the abort Chromium reports when the frame goes away. */
const isStuckNavigation = (error: unknown): boolean => {
  const isAborted = error instanceof Error && error.message.includes('net::ERR_ABORTED');

  return error instanceof errors.TimeoutError || isAborted;
};

/** Navigates to `SHELL_URL` bounded, retrying a stuck first try once and saying what Chromium did with it (C84). */
export class ShellNavigation {
  private readonly page: Page;
  private readonly tryMs: number;
  private issued: number;
  private finished: number;
  private failure: string | null;

  /** `tryMs` bounds each try; only the spec of this retry passes a shorter one, to stay fast. */
  public constructor(page: Page, tryMs: number = SHELL_GOTO_MS) {
    this.page = page;
    this.tryMs = tryMs;
    this.issued = 0;
    this.finished = 0;
    this.failure = null;
  }

  /** Serves every shell file with `handler`, then goes to `SHELL_URL` as `goto` does. */
  public async open(handler: RouteHandler, waitUntil: NavigationWait = 'load'): Promise<void> {
    await this.page.route(`${SHELL_ORIGIN}/**`, handler);
    await this.goto(waitUntil);
  }

  /**
   * Goes to `SHELL_URL`, each try bounded by `tryMs`. A first try that times out or aborts is retried once; a retry that
   * loads is recorded as a `C84` annotation, also written to stderr since the list reporter prints no annotations, and
   * one that fails throws `C84: …` with what Chromium did with the `index.html` request on both tries.
   */
  public async goto(waitUntil: NavigationWait = 'load'): Promise<void> {
    const onRequest = (request: Request): void => this.noteIssued(request);
    const onFinished = (request: Request): void => this.noteFinished(request);
    const onFailed = (request: Request): void => this.noteFailed(request);

    this.page.on('request', onRequest);
    this.page.on('requestfinished', onFinished);
    this.page.on('requestfailed', onFailed);

    try {
      await this.gotoWithRetry(waitUntil);
    } finally {
      this.page.off('request', onRequest);
      this.page.off('requestfinished', onFinished);
      this.page.off('requestfailed', onFailed);
    }
  }

  private async gotoWithRetry(waitUntil: NavigationWait): Promise<void> {
    const firstTry = await this.tried(waitUntil);

    if (firstTry === null) return;

    await this.cleared(firstTry);

    const secondTry = await this.tried(waitUntil);

    if (secondTry !== null) throw new Error(`C84: shell navigation stuck twice; first try ${firstTry}; retry ${secondTry}`);

    const description = `shell navigation retried and loaded; first try ${firstTry}`;

    test.info().annotations.push({ type: 'C84', description });
    console.warn(`C84 ${description}`);
  }

  /** Replaces the stuck navigation with a blank page; a frame too wedged for that still throws with the first try's diagnosis. */
  private async cleared(firstTry: string): Promise<void> {
    const gotoOptions = { timeout: CLEAR_MS };

    try {
      await this.page.goto(CLEAR_PAGE, gotoOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'a non-Error value';

      throw new Error(`C84: clearing the stuck navigation failed; first try ${firstTry}; then ${message}`, { cause: error });
    }
  }

  /** Runs one bounded `goto`; returns `null` when it loaded, else what happened, and rethrows any other failure. */
  private async tried(waitUntil: NavigationWait): Promise<string | null> {
    const gotoOptions = { timeout: this.tryMs, waitUntil };

    this.issued = 0;
    this.finished = 0;
    this.failure = null;

    try {
      await this.page.goto(SHELL_URL, gotoOptions);

      return null;
    } catch (error) {
      const isStuck = isStuckNavigation(error);

      if (!isStuck) throw error;

      return this.diagnosis(error);
    }
  }

  private diagnosis(error: unknown): string {
    const message = error instanceof Error ? error.message : 'a non-Error value';
    const [firstLine] = message.split('\n');
    const failed = this.failure === null ? 'none failed' : `failed: ${this.failure}`;

    return `failed with "${firstLine}": index.html requests issued ${this.issued}, finished ${this.finished}, ${failed}`;
  }

  private noteIssued(request: Request): void {
    const url = request.url();

    if (url === SHELL_URL) this.issued += 1;
  }

  private noteFinished(request: Request): void {
    const url = request.url();

    if (url === SHELL_URL) this.finished += 1;
  }

  private noteFailed(request: Request): void {
    const url = request.url();

    if (url === SHELL_URL) this.failure = request.failure()?.errorText ?? 'no error text';
  }
}
