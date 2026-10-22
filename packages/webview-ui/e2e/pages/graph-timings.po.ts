/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Page } from '@playwright/test';

/** The probe's timing facts in ms; each is `null` until the page has measured it. */
export class GraphTimings {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async firstFrameMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.firstFrameMs() ?? null);
  }

  public async controlsBuiltMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.controlsBuiltMs() ?? null);
  }

  public async filterAppliedMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.filterAppliedMs() ?? null);
  }

  public async detailsBuiltMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.detailsBuiltMs() ?? null);
  }

  public async pickingBuiltMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.pickingBuiltMs() ?? null);
  }

  public async toggleMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.toggleMs() ?? null);
  }

  public async traceMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.traceMs() ?? null);
  }
}
