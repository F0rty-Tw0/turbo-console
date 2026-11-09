import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';

import { PageViewport } from './page-viewport.po.ts';
import { BLANK_PAGE } from '../common/graph.const.ts';

/** Registered before any other listener: keeps every real `resize` event from the page, as a frame that never comes would. */
const RESIZE_SWALLOWER = `addEventListener('resize', (event) => {
  if (event.isTrusted) event.stopImmediatePropagation();
}, true);`;

/** A pointer move fires a synthetic `resize` event, which the swallower lets through. */
const RESIZE_ON_POINTER_MOVE = `addEventListener('mousemove', () => dispatchEvent(new Event('resize')));`;

/** Every layout read throws, so the forced-layout nudge rejects. */
const THROWING_LAYOUT = `Element.prototype.getBoundingClientRect = () => {
  throw new Error('layout read blocked');
};`;

/** The first `resize` event spins the page forever, as a wedged renderer that answers nothing does. */
const WEDGE_ON_RESIZE = `addEventListener('resize', () => {
  for (;;);
}, true);`;

/** A blank page whose `resize` events can be held back, to check how `PageViewport` waits for them (F-U8-8). */
export class ResizeStall {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly viewport: PageViewport;
  private readonly warnings: string[];
  private resizeMs: number | null;

  /** `warnings` is the test process's `console.warn` lines, which its fixture records. */
  public constructor(page: Page, testInfo: TestInfo, warnings: string[]) {
    this.page = page;
    this.testInfo = testInfo;
    this.viewport = new PageViewport(page);
    this.warnings = warnings;
    this.resizeMs = null;
  }

  /** Before the page loads: no real `resize` event reaches the page. */
  public async swallowResizeEvents(): Promise<void> {
    await this.page.addInitScript({ content: RESIZE_SWALLOWER });
  }

  /** Before the page loads: a pointer move gives the page a `resize` event. */
  public async resizeOnPointerMove(): Promise<void> {
    await this.page.addInitScript({ content: RESIZE_ON_POINTER_MOVE });
  }

  /** Before the page loads: a forced layout throws. */
  public async throwOnLayout(): Promise<void> {
    await this.page.addInitScript({ content: THROWING_LAYOUT });
  }

  /** Before the page loads: its first `resize` event leaves it answering nothing. */
  public async wedgeOnResize(): Promise<void> {
    await this.page.addInitScript({ content: WEDGE_ON_RESIZE });
  }

  public async open(): Promise<void> {
    await this.page.goto(BLANK_PAGE);
  }

  /** Resizes the page and remembers how long that took, by Node's clock. */
  public async resize(width: number, height: number): Promise<void> {
    const startedAt = Date.now();

    await this.viewport.resize(width, height);
    this.resizeMs = Date.now() - startedAt;
  }

  public expectResizeUnder(ms: number): void {
    expect(this.resizeMs).toBeLessThan(ms);
  }

  public async expectResizeToFail(width: number, height: number, message: RegExp): Promise<void> {
    const resizing = this.viewport.resize(width, height);

    await expect(resizing).rejects.toThrow(message);
  }

  /** The running test's `F-U8-8` annotations match `descriptions`, one each, in order. */
  public expectNotes(descriptions: RegExp[]): void {
    const notes = this.testInfo.annotations.filter((annotation) => annotation.type === 'F-U8-8');
    const noteTexts = notes.map((note) => note.description);
    const matchers = descriptions.map((description) => expect.stringMatching(description));

    expect(noteTexts).toEqual(matchers);
  }

  /** The test process's `F-U8-8` warn lines, which the list reporter carries to the CI log, match `lines`, one each, in order. */
  public expectWarnings(lines: RegExp[]): void {
    const warnings = this.warnings.filter((warning) => warning.startsWith('F-U8-8'));
    const matchers = lines.map((line) => expect.stringMatching(line));

    expect(warnings).toEqual(matchers);
  }
}
