import type { ConsoleMessage, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { HostMessage, WebviewMessage } from '../../src/bridge/common/details-message.type.ts';
import type { DetailsState, RunView } from '../../src/bridge/common/details-state.type.ts';
import type { FieldRow } from '../../src/details/common/details-page.type.ts';
import { HOST_API_STUB, SHELL_ORIGIN, SHELL_URL, VIOLATION_RECORDER } from '../common/shell.const.ts';
import { detailsDistMock } from '../test/mocks/details-dist.mock.ts';

const postToPage = (message: HostMessage): void => window.postMessage(message, '*');

/** `document.fonts.check('16px codicon')` is also true when no codicon face exists at all, so look for a loaded face. */
const CODICON_LOADED = `document.fonts.check('16px codicon')
  && [...document.fonts].some((face) => face.family.replaceAll('"', '') === 'codicon' && face.status === 'loaded')`;

export class DetailsPage {
  public readonly heading: Locator;
  public readonly path: Locator;
  public readonly tags: Locator;
  public readonly cards: Locator;
  public readonly statuses: Locator;
  public readonly images: Locator;
  public readonly missingNotice: Locator;
  public readonly reloadBanner: Locator;
  public readonly dryRunBanner: Locator;

  private readonly errors: string[];
  private readonly page: Page;
  private scrolledY: number;

  public constructor(page: Page) {
    this.page = page;
    this.errors = [];
    this.scrolledY = 0;
    this.heading = page.getByRole('heading', { level: 1 });
    this.path = page.locator('.package-path');
    this.tags = page.locator('.tag');
    this.cards = page.locator('section.card');
    this.statuses = page.locator('.run-status');
    this.images = page.locator('img');
    this.missingNotice = page.getByText('Package no longer in the workspace');
    this.reloadBanner = page.locator('.banner-warning');
    this.dryRunBanner = page.locator('.banner-error');
  }

  /** Loads the page inside the host stub, then posts `state` as the host does after `ready`. */
  public async open(state: DetailsState): Promise<void> {
    const message: HostMessage = { type: 'state', state };

    this.page.on('console', (consoleMessage: ConsoleMessage): void => this.recordConsoleError(consoleMessage));
    this.page.on('pageerror', (error: Error): void => this.recordPageError(error));
    await this.page.addInitScript({ content: VIOLATION_RECORDER });
    await this.page.addInitScript({ content: HOST_API_STUB });
    await this.page.route(`${SHELL_ORIGIN}/**`, detailsDistMock());
    await this.page.goto(SHELL_URL);
    await this.page.evaluate(postToPage, message);
    await this.heading.waitFor();
  }

  public async sendRunState(taskId: string, run: RunView): Promise<void> {
    const message: HostMessage = { type: 'runState', taskId, run };

    await this.page.evaluate(postToPage, message);
  }

  public async narrow(width: number): Promise<void> {
    const size = { width, height: 600 };

    await this.page.setViewportSize(size);
  }

  public async scrollToBottom(): Promise<void> {
    await this.page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
    this.scrolledY = await this.page.evaluate<number>('scrollY');
  }

  public async focusRun(taskName: string): Promise<void> {
    await this.page.getByRole('button', { name: `Run ${taskName}`, exact: true }).focus();
  }

  public async retryReload(): Promise<void> {
    await this.reloadBanner.getByRole('button', { name: 'Retry' }).click();
  }

  public async retryDryRun(): Promise<void> {
    await this.dryRunBanner.getByRole('button', { name: 'Retry' }).click();
  }

  public async expectCardFields(taskName: string, rows: FieldRow[]): Promise<void> {
    const card = this.card(taskName);
    const terms = rows.map(([term]: FieldRow): string => term);
    const values = rows.map(([, value]: FieldRow): string => value);

    await expect(card.locator('dt')).toHaveText(terms);
    await expect(card.locator('dd')).toHaveText(values);
  }

  public async expectBadges(taskName: string, labels: string[]): Promise<void> {
    await expect(this.card(taskName).locator('.badge')).toHaveText(labels);
  }

  public async expectStopFocused(taskName: string): Promise<void> {
    await expect(this.page.getByRole('button', { name: `Stop ${taskName}`, exact: true })).toBeFocused();
  }

  public async expectScrollKept(): Promise<void> {
    const scrollY = await this.page.evaluate<number>('scrollY');

    expect(this.scrolledY).toBeGreaterThan(0);
    expect(scrollY).toBe(this.scrolledY);
  }

  public async expectLastPosted(message: WebviewMessage): Promise<void> {
    const posted = await this.page.evaluate<unknown[]>('window.__posted');

    expect(posted.at(-1)).toEqual(message);
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
    const violations = await this.page.evaluate<string[]>('window.__violations');

    expect(violations).toEqual([]);
  }

  public expectNoErrors(): void {
    expect(this.errors).toEqual([]);
  }

  private card(taskName: string): Locator {
    const title = this.page.getByRole('heading', { level: 2, name: taskName, exact: true });

    return this.cards.filter({ has: title });
  }

  private recordConsoleError(message: ConsoleMessage): void {
    const type = message.type();

    if (type !== 'error') return;

    this.errors.push(message.text());
  }

  private recordPageError(error: Error): void {
    this.errors.push(error.message);
  }
}
