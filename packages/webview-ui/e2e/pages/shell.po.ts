import type { ConsoleMessage, Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { HOST_API_STUB, SHELL_ORIGIN, SHELL_URL, STRING_SINK_PROBE, VIOLATION_RECORDER } from '../common/shell.const.ts';
import type { ShellOptions } from '../common/shell.type.ts';
import { distMock } from '../test/mocks/dist.mock.ts';

export class ShellPage {
  public readonly readyMarker: Locator;

  private readonly errors: string[];
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.errors = [];
    this.readyMarker = page.getByTestId('webview-ui-ready');
  }

  public async goto(options: ShellOptions = {}): Promise<void> {
    this.page.on('console', (message: ConsoleMessage): void => this.recordConsoleError(message));
    this.page.on('pageerror', (error: Error): void => this.recordPageError(error));
    await this.page.addInitScript({ content: VIOLATION_RECORDER });

    if (options.host === true) {
      await this.page.addInitScript({ content: HOST_API_STUB });
    }

    await this.page.route(`${SHELL_ORIGIN}/**`, distMock(options));
    await this.page.goto(SHELL_URL);
  }

  public async expectReady(): Promise<void> {
    await expect(this.readyMarker).toBeVisible();
  }

  public async expectReadyPosted(): Promise<void> {
    const posted = await this.page.evaluate<unknown[]>('window.__posted');
    const readyOnly = [{ type: 'ready' }];

    expect(posted).toEqual(readyOnly);
  }

  public async expectNoViolations(): Promise<void> {
    const violations = await this.page.evaluate<string[]>('window.__violations');

    expect(violations).toEqual([]);
  }

  public async expectViolation(): Promise<void> {
    await expect.poll(async (): Promise<number> => this.page.evaluate<number>('window.__violations.length')).toBeGreaterThanOrEqual(1);
  }

  public async expectInlineScriptBlocked(): Promise<void> {
    const ran = await this.page.evaluate<unknown>('window.__ran');

    expect(ran).toBeUndefined();
  }

  /** Trusted Types: under `require-trusted-types-for 'script'` a plain string written to `innerHTML` throws a TypeError. */
  public async expectStringSinkRefused(): Promise<void> {
    const outcome = await this.page.evaluate<string>(STRING_SINK_PROBE);

    expect(outcome).toBe('TypeError');
  }

  public expectNoErrors(): void {
    expect(this.errors).toEqual([]);
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
