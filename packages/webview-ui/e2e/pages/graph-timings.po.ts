/* eslint-disable no-underscore-dangle -- the page exposes the probe as window.__tcGraphProbe */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Polls `read` until the page has measured `fact`, then returns it. */
const measuredOf = async (read: () => Promise<number | null>, fact: string): Promise<number> => {
  await expect.poll(read).not.toBeNull();

  const ms = await read();

  if (ms === null) throw new Error(`graph e2e: ${fact} was not measured`);

  return ms;
};

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

  public async atomToggleMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.atomToggleMs() ?? null);
  }

  public async traceMs(): Promise<number | null> {
    return this.page.evaluate((): number | null => window.__tcGraphProbe?.traceMs() ?? null);
  }

  /** Polls until the first frame is measured, then returns it. */
  public async measuredFirstFrameMs(): Promise<number> {
    return measuredOf(async (): Promise<number | null> => this.firstFrameMs(), 'the first frame');
  }

  /** Polls until the last folder toggle is measured, then returns it. */
  public async measuredToggleMs(): Promise<number> {
    return measuredOf(async (): Promise<number | null> => this.toggleMs(), 'the folder toggle');
  }

  /** Polls until the last Atomizer group toggle is measured, then returns it. */
  public async measuredAtomToggleMs(): Promise<number> {
    return measuredOf(async (): Promise<number | null> => this.atomToggleMs(), 'the Atomizer group toggle');
  }
}
