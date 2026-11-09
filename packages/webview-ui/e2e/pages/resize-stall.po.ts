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

/** A blank page whose `resize` events can be held back, to check how `PageViewport` waits for them (F-U8-8). */
export class ResizeStall {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly viewport: PageViewport;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.viewport = new PageViewport(page);
  }

  /** Before the page loads: no real `resize` event reaches the page. */
  public async swallowResizeEvents(): Promise<void> {
    await this.page.addInitScript({ content: RESIZE_SWALLOWER });
  }

  /** Before the page loads: a pointer move gives the page a `resize` event. */
  public async resizeOnPointerMove(): Promise<void> {
    await this.page.addInitScript({ content: RESIZE_ON_POINTER_MOVE });
  }

  public async open(): Promise<void> {
    await this.page.goto(BLANK_PAGE);
  }

  public async resize(width: number, height: number): Promise<void> {
    await this.viewport.resize(width, height);
  }

  public async expectResizeToFail(width: number, height: number): Promise<void> {
    const resizing = this.viewport.resize(width, height);

    await expect(resizing).rejects.toThrow(/^F-U8-8: no resize event, even after every nudge: resize wanted/u);
  }

  /** The running test's `F-U8-8` annotations match `descriptions`, one each, in order. */
  public expectNotes(descriptions: RegExp[]): void {
    const notes = this.testInfo.annotations.filter((annotation) => annotation.type === 'F-U8-8');
    const noteTexts = notes.map((note) => note.description);
    const matchers = descriptions.map((description) => expect.stringMatching(description));

    expect(noteTexts).toEqual(matchers);
  }
}
