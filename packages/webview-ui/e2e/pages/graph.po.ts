import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PageDiagnostics } from './page-diagnostics.po.ts';
import {
  CLEAR_LABEL,
  FALLBACK_NOTICE_TEXT,
  FIT_LABEL,
  GRAPH_LABEL,
  RELAYOUT_LABEL,
  RETRY_LABEL
} from '../../src/graph/common/graph.const.ts';
import { LONGTASK_RECORDER, PROBE_WANTED, THEME_VAR_NAMES, WORKER_STUBS } from '../common/graph.const.ts';
import type { GraphOptions, ThemeStub } from '../common/graph.type.ts';
import { HOST_API_STUB, SHELL_ORIGIN, SHELL_URL } from '../common/shell.const.ts';
import { graphDistMock } from '../test/mocks/graph-dist.mock.ts';
import { switchTheme } from '../test/utils/graph-theme.spec.util.ts';

const TOOLBAR_BUTTONS = [FIT_LABEL, RELAYOUT_LABEL, CLEAR_LABEL];

/** The graph page's DOM: toolbar, status line, notice and container, and the keys and themes that act on them. */
export class GraphPage {
  public readonly container: Locator;
  public readonly notice: Locator;
  public readonly status: Locator;

  private readonly diagnostics: PageDiagnostics;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.diagnostics = new PageDiagnostics(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.notice = page.getByText(FALLBACK_NOTICE_TEXT);
    this.status = page.getByRole('status');
  }

  /** Opens the real graph page under the graph CSP; every option is applied before the page loads. */
  public async open(options: GraphOptions = {}): Promise<void> {
    await this.diagnostics.attach();

    if (options.probe !== false) await this.page.addInitScript({ content: PROBE_WANTED });

    if (options.host !== false) await this.page.addInitScript({ content: HOST_API_STUB });

    await this.page.addInitScript({ content: LONGTASK_RECORDER });
    await this.page.addInitScript({ content: WORKER_STUBS[options.workers ?? 'real'] });
    await this.page.route(`${SHELL_ORIGIN}/**`, graphDistMock(options));
    await this.page.goto(SHELL_URL);
    await this.container.waitFor();
  }

  public async pressButton(label: string): Promise<void> {
    await this.buttonOf(label).click();
  }

  public async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  public async pressOnButton(label: string, key: string): Promise<void> {
    await this.focusButton(label);
    await this.page.keyboard.press(key);
  }

  public async focusButton(label: string): Promise<void> {
    await this.buttonOf(label).focus();
  }

  public async focusContainer(): Promise<void> {
    await this.container.focus();
  }

  public async applyTheme(theme: ThemeStub): Promise<void> {
    await this.page.evaluate(switchTheme, { names: THEME_VAR_NAMES, theme });
  }

  public async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  public async expectStatus(text: string): Promise<void> {
    await expect(this.status).toHaveText(text);
  }

  public async expectDisabled(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeDisabled();
  }

  public async expectButtonFocused(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeFocused();
  }

  public async expectContainerFocused(): Promise<void> {
    await expect(this.container).toBeFocused();
  }

  /** No host state yet: toolbar and the empty container shown, all three toolbar buttons disabled. */
  public async expectPreState(): Promise<void> {
    await expect(this.container).toBeVisible();

    for (const label of TOOLBAR_BUTTONS) await this.expectDisabledButtonShown(label);
  }

  public async expectFallbackNotice(): Promise<void> {
    await expect(this.notice).toBeVisible();
    await expect(this.buttonOf(RETRY_LABEL)).toBeVisible();
  }

  public async expectNoNotice(): Promise<void> {
    await expect(this.notice).toBeHidden();
  }

  public async expectNoViolations(): Promise<void> {
    await this.diagnostics.expectNoViolations();
  }

  public async expectViolation(): Promise<void> {
    await this.diagnostics.expectViolation();
  }

  public async expectInlineScriptBlocked(): Promise<void> {
    await this.diagnostics.expectInlineScriptBlocked();
  }

  public async expectStringSinkRefused(): Promise<void> {
    await this.diagnostics.expectStringSinkRefused();
  }

  public expectNoErrors(): void {
    this.diagnostics.expectNoErrors();
  }

  private async expectDisabledButtonShown(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeVisible();
    await this.expectDisabled(label);
  }

  private buttonOf(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }
}
