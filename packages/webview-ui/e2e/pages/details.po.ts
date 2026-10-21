import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PageDiagnostics } from './page-diagnostics.po.ts';
import { TaskCardSection } from './task-card.po.ts';
import type { HostMessage, WebviewMessage } from '../../src/bridge/common/details-message.type.ts';
import type { DetailsState, RunView } from '../../src/bridge/common/details-state.type.ts';
import { CODICON_LOADED, HOST_API_STUB, SHELL_ORIGIN, SHELL_URL } from '../common/shell.const.ts';
import { detailsDistMock } from '../test/mocks/details-dist.mock.ts';

const postToPage = (message: HostMessage): void => window.postMessage(message, '*');

/** Resolves after two frames, so the scroll events of the last scroll have fired. */
const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

export class DetailsPage {
  public readonly heading: Locator;
  public readonly path: Locator;
  public readonly tags: Locator;
  public readonly cards: Locator;
  public readonly statuses: Locator;
  public readonly images: Locator;
  public readonly missingNotice: Locator;
  public readonly noCardsNotice: Locator;
  public readonly sectionTitles: Locator;
  public readonly sectionCounts: Locator;
  public readonly cardTitles: Locator;
  public readonly reloadBanner: Locator;
  public readonly dryRunBanner: Locator;
  public readonly banners: Locator;

  private readonly diagnostics: PageDiagnostics;
  private readonly page: Page;
  private scrolledY: number;

  public constructor(page: Page) {
    this.page = page;
    this.diagnostics = new PageDiagnostics(page);
    this.scrolledY = 0;
    this.heading = page.getByRole('heading', { level: 1 });
    this.path = page.locator('.package-path');
    this.tags = page.locator('.tag');
    this.cards = page.locator('section.card');
    this.statuses = page.locator('.run-status');
    this.images = page.locator('img');
    this.missingNotice = page.getByText('Package no longer in the workspace');
    this.noCardsNotice = page.locator('.no-tasks');
    this.sectionTitles = page.getByRole('heading', { level: 2 });
    this.sectionCounts = page.locator('.section-count');
    this.cardTitles = page.getByRole('heading', { level: 3 });
    this.reloadBanner = page.locator('.banner-warning');
    this.dryRunBanner = page.locator('.banner-error');
    this.banners = page.locator('.banner');
  }

  /** Loads the page inside the host stub, then posts `state` as the host does after `ready`. */
  public async open(state: DetailsState): Promise<void> {
    const message: HostMessage = { type: 'state', state };

    await this.diagnostics.attach();
    await this.page.addInitScript({ content: HOST_API_STUB });
    await this.page.route(`${SHELL_ORIGIN}/**`, detailsDistMock());
    await this.page.goto(SHELL_URL);
    await this.page.evaluate(postToPage, message);
    await this.heading.waitFor();
  }

  /** Before `open`: stands in for the scroll position VS Code kept from an earlier instance of the page. */
  public async restoreScroll(scrollY: number): Promise<void> {
    const savedState = JSON.stringify({ scrollY });

    await this.page.addInitScript({ content: `window.__state = ${savedState};` });
  }

  public card(taskName: string): TaskCardSection {
    const card = new TaskCardSection(this.page, taskName);

    return card;
  }

  /** Before `open`: the user asked the OS for reduced motion. */
  public async reduceMotion(): Promise<void> {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
  }

  /** Posts a later state, as the host does after a model change. */
  public async sendState(state: DetailsState): Promise<void> {
    const message: HostMessage = { type: 'state', state };

    await this.page.evaluate(postToPage, message);
  }

  public async sendRunState(taskId: string, run: RunView): Promise<void> {
    const message: HostMessage = { type: 'runState', taskId, run };

    await this.page.evaluate(postToPage, message);
  }

  public async pressButton(label: string): Promise<void> {
    await this.button(label).click();
  }

  public async focusButton(label: string): Promise<void> {
    await this.button(label).focus();
  }

  public async narrow(width: number): Promise<void> {
    const size = { width, height: 600 };

    await this.page.setViewportSize(size);
  }

  public async scrollToBottom(): Promise<void> {
    await this.page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
    this.scrolledY = await this.page.evaluate<number>('scrollY');
  }

  public async retryReload(): Promise<void> {
    await this.reloadBanner.getByRole('button', { name: 'Retry' }).click();
  }

  public async retryDryRun(): Promise<void> {
    await this.dryRunBanner.getByRole('button', { name: 'Retry' }).click();
  }

  public async expectFocused(label: string): Promise<void> {
    await expect(this.button(label)).toBeFocused();
  }

  public async expectScrollKept(): Promise<void> {
    const scrollY = await this.page.evaluate<number>('scrollY');

    expect(this.scrolledY).toBeGreaterThan(0);
    expect(scrollY).toBe(this.scrolledY);
  }

  /** The scroll position the page last handed to `setState`, read after the next frame's scroll events. */
  public async expectSavedScrollY(scrollY: number): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);

    const savedScrollY = await this.page.evaluate<unknown>('window.__state?.scrollY');

    expect(savedScrollY).toBe(scrollY);
  }

  public async expectScrollY(scrollY: number): Promise<void> {
    const readScrollY = async (): Promise<number> => this.page.evaluate<number>('scrollY');

    await expect.poll(readScrollY).toBe(scrollY);
  }

  public async expectLastPosted(message: WebviewMessage): Promise<void> {
    const posted = await this.page.evaluate<unknown[]>('window.__posted');

    expect(posted.at(-1)).toEqual(message);
  }

  /** Every message the page posted, in order, starting with `ready`. */
  public async expectPosted(messages: WebviewMessage[]): Promise<void> {
    const posted = await this.page.evaluate<unknown[]>('window.__posted');

    expect(posted).toEqual(messages);
  }

  public async expectNoHorizontalScroll(width: number): Promise<void> {
    const scrollWidth = await this.page.evaluate<number>('document.documentElement.scrollWidth');

    expect(scrollWidth).toBeLessThanOrEqual(width);
  }

  public async expectCodiconFont(): Promise<void> {
    const isLoaded = async (): Promise<boolean> => this.page.evaluate<boolean>(CODICON_LOADED);

    await expect.poll(isLoaded).toBe(true);
  }

  public async expectNoViolations(): Promise<void> {
    await this.diagnostics.expectNoViolations();
  }

  public expectNoErrors(): void {
    this.diagnostics.expectNoErrors();
  }

  private button(label: string): Locator {
    const button = this.page.getByRole('button', { name: label, exact: true });

    return button;
  }
}
