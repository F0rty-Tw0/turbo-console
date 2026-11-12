import type { Page, Route, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';

import { ShellNavigation } from './shell-navigation.po.ts';
import type { RouteHandler } from '../common/playwright.type.ts';
import { SHELL_URL } from '../common/shell.const.ts';
import { detailsDistMock } from '../test/mocks/details-dist.mock.ts';

/** Bounds each try, short so a held try costs the spec one second rather than the real ten. */
const TRY_MS = 1000;

/** The `<title>` of the built details shell. */
const SHELL_TITLE = 'Package Details';

const holdRequest = async (): Promise<void> => new Promise<void>((): void => undefined);

/** The details shell whose first `index.html` requests can be held forever, to check how `ShellNavigation` retries (C84). */
export class ShellStall {
  private readonly page: Page;
  private readonly testInfo: TestInfo;
  private readonly navigation: ShellNavigation;
  private readonly serve: RouteHandler;
  private readonly handler: RouteHandler;
  private heldCount: number;
  private seenCount: number;

  public constructor(page: Page, testInfo: TestInfo) {
    this.page = page;
    this.testInfo = testInfo;
    this.navigation = new ShellNavigation(page, TRY_MS);
    this.serve = detailsDistMock();
    this.handler = async (route: Route): Promise<void> => this.holdOrServe(route);
    this.heldCount = 0;
    this.seenCount = 0;
  }

  /** Before `open`: the first `count` `index.html` requests never answer; later ones are served. */
  public holdShell(count: number): void {
    this.heldCount = count;
  }

  public async open(): Promise<void> {
    await this.navigation.open(this.handler);
  }

  public async expectOpenToFail(message: RegExp): Promise<void> {
    const opening = this.navigation.open(this.handler);

    await expect(opening).rejects.toThrow(message);
  }

  public async expectShellLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(SHELL_URL);
    await expect(this.page).toHaveTitle(SHELL_TITLE);
  }

  /** The running test's `C84` annotations match `descriptions`, one each, in order. */
  public expectNotes(descriptions: RegExp[]): void {
    const notes = this.testInfo.annotations.filter((annotation) => annotation.type === 'C84');
    const noteTexts = notes.map((note) => note.description);
    const matchers = descriptions.map((description) => expect.stringMatching(description));

    expect(noteTexts).toEqual(matchers);
  }

  /** Holds the first `heldCount` `index.html` requests forever and serves every other shell file. */
  private async holdOrServe(route: Route): Promise<void> {
    const url = route.request().url();

    if (url === SHELL_URL) this.seenCount += 1;

    const isHeld = url === SHELL_URL && this.seenCount <= this.heldCount;

    if (isHeld) return holdRequest();

    await this.serve(route);
  }
}
