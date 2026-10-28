import type { ConsoleMessage, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { ERROR_EVENT_RECORDER, STRING_SINK_PROBE, VIOLATION_RECORDER } from '../common/shell.const.ts';

/** What went wrong in the page: console errors, uncaught exceptions and CSP violations. */
export class PageDiagnostics {
  private readonly errors: string[];
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.errors = [];
  }

  /** Before the page loads: starts recording errors, and through init scripts error events and CSP violations. */
  public async attach(): Promise<void> {
    this.page.on('console', (consoleMessage: ConsoleMessage): void => this.recordConsoleError(consoleMessage));
    this.page.on('pageerror', (error: Error): void => this.recordPageError(error));
    await this.page.addInitScript({ content: ERROR_EVENT_RECORDER });
    await this.page.addInitScript({ content: VIOLATION_RECORDER });
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
