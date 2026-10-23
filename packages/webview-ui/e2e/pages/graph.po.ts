import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PageDiagnostics } from './page-diagnostics.po.ts';
import {
  FALLBACK_NOTICE_TEXT,
  GRAPH_LABEL,
  LAYOUT_FAILED_TEXT,
  LOADING_TEXT,
  RETRY_LABEL
} from '../../src/graph/common/graph.const.ts';
import { BROKEN_MEASURE, NEXT_FRAME, PROBE_WANTED, TOOLBAR_LABELS, WORKER_STUBS } from '../common/graph.const.ts';
import type { GraphOptions } from '../common/graph.type.ts';
import { HOST_API_STUB, SHELL_ORIGIN, SHELL_URL } from '../common/shell.const.ts';
import { graphDistMock } from '../test/mocks/graph-dist.mock.ts';
import { savedStateScript } from '../test/utils/graph-saved-state.spec.util.ts';
import { pollutedBuiltins, trustedTypesEscapes } from '../test/utils/graph-trusted-types.spec.util.ts';

/** The graph page's DOM: toolbar, status line, notice and container, and the keys and themes that act on them. */
export class GraphPage {
  public readonly container: Locator;
  public readonly loading: Locator;
  public readonly notice: Locator;
  public readonly status: Locator;

  private readonly diagnostics: PageDiagnostics;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.diagnostics = new PageDiagnostics(page);
    this.container = page.getByRole('application', { name: GRAPH_LABEL });
    this.loading = page.getByText(LOADING_TEXT, { exact: true });
    this.notice = page.getByText(FALLBACK_NOTICE_TEXT);
    this.status = page.getByRole('status').filter({ hasNotText: /^Showing/ });
  }

  /** Opens the real graph page under the graph CSP; every option is applied before the page loads. */
  public async open(options: GraphOptions = {}): Promise<void> {
    await this.diagnostics.attach();

    if (options.probe !== false) await this.page.addInitScript({ content: PROBE_WANTED });

    if (options.host !== false) await this.page.addInitScript({ content: HOST_API_STUB });

    if (options.savedState !== undefined) await this.page.addInitScript({ content: savedStateScript(options.savedState) });

    if (options.isMeasureBroken === true) await this.page.addInitScript({ content: BROKEN_MEASURE });

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

  /** Holds `key` down until it repeats once, then lets it go: two `keydown` events, the second with `repeat` set. */
  public async holdKey(key: string): Promise<void> {
    await this.page.keyboard.down(key);
    await this.page.keyboard.down(key);
    await this.page.keyboard.up(key);
  }

  /** Two frames, so a message posted to the page has been handled. */
  public async waitFrames(): Promise<void> {
    await this.page.evaluate(NEXT_FRAME);
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

  public async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text, { exact: true })).toBeVisible();
  }

  /** Loading is hidden at once, with no wait for it to go. */
  public async expectNotLoadingNow(): Promise<void> {
    const isLoading = await this.loading.isVisible();

    expect(isLoading).toBe(false);
  }

  public async expectNotLoading(): Promise<void> {
    await expect(this.loading).toBeHidden();
  }

  /** The graph container and every toolbar button are hidden. */
  public async expectGraphHidden(): Promise<void> {
    await expect(this.container).toBeHidden();

    for (const label of TOOLBAR_LABELS) await expect(this.buttonOf(label)).toBeHidden();
  }

  /** Under the graph CSP, a second `tc-elk` policy, a `default` policy and a worker from a raw blob URL string all throw. */
  public async expectTrustedTypesLocked(): Promise<void> {
    const outcomes = await this.page.evaluate(trustedTypesEscapes);

    expect(outcomes).toEqual(['TypeError', 'TypeError', 'TypeError']);
  }

  /** No draw wrote `x` or `y` onto `Object`, its prototype, or the prototype's methods. */
  public async expectBuiltinsUntouched(): Promise<void> {
    const polluted = await this.page.evaluate(pollutedBuiltins);

    expect(polluted).toEqual([]);
  }

  public async expectNotFailedNow(): Promise<void> {
    const isFailed = await this.page.getByText(LAYOUT_FAILED_TEXT).isVisible();

    expect(isFailed).toBe(false);
  }

  /** The page says the graph could not be drawn, and why. */
  public async expectLayoutFailed(): Promise<void> {
    await expect(this.page.getByText(LAYOUT_FAILED_TEXT)).toBeVisible();
  }

  public async expectStatus(text: string): Promise<void> {
    await expect(this.status).toHaveText(text);
  }

  public async expectDisabled(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeDisabled();
  }

  public async expectEnabled(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeEnabled();
  }

  public async expectButtonFocused(label: string): Promise<void> {
    await expect(this.buttonOf(label)).toBeFocused();
  }

  public async expectContainerFocused(): Promise<void> {
    await expect(this.container).toBeFocused();
  }

  /** No host state yet: toolbar and the empty container shown, every toolbar button disabled. */
  public async expectPreState(): Promise<void> {
    await expect(this.container).toBeVisible();

    for (const label of TOOLBAR_LABELS) await this.expectDisabledButtonShown(label);
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
