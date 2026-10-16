import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { FieldRow } from '../../src/details/common/details-page.type.ts';

/** One task card, found by its exact title text, never by a selector built from the name. */
export class TaskCardSection {
  public readonly title: Locator;
  public readonly runButton: Locator;
  public readonly copyButton: Locator;
  public readonly status: Locator;

  private readonly root: Locator;
  private readonly statusIcon: Locator;

  public constructor(page: Page, taskName: string) {
    const heading = page.getByRole('heading', { level: 3, name: taskName, exact: true });

    this.root = page.locator('section.card').filter({ has: heading });
    this.title = this.root.locator('.card-title');
    this.runButton = this.root.locator('.run-slot button');
    this.copyButton = this.root.locator('.card-actions > button');
    this.status = this.root.locator('.run-status');
    this.statusIcon = this.status.locator('.codicon');
  }

  public async expectFields(rows: FieldRow[]): Promise<void> {
    const terms = rows.map(([term]: FieldRow): string => term);
    const values = rows.map(([, value]: FieldRow): string => value);

    await expect(this.root.locator('dt')).toHaveText(terms);
    await expect(this.root.locator('dd')).toHaveText(values);
  }

  public async expectBadges(labels: string[]): Promise<void> {
    await expect(this.root.locator('.badge')).toHaveText(labels);
  }

  /** Every item of the badge row, badges and notes alike, in order. */
  public async expectBadgeRow(texts: string[]): Promise<void> {
    await expect(this.root.locator('.badges > li')).toHaveText(texts);
  }

  /** The status line has no icon and no text. */
  public async expectBlankStatus(): Promise<void> {
    await expect(this.status.locator('*')).toHaveCount(0);
    await expect(this.status).toHaveText('');
  }

  public async expectIconAnimation(animationName: string): Promise<void> {
    const readAnimation = (icon: HTMLElement | SVGElement): string => getComputedStyle(icon).animationName;
    const computedAnimation = async (): Promise<string> => this.statusIcon.evaluate(readAnimation);

    await expect.poll(computedAnimation).toBe(animationName);
  }

  /** The status icon has exactly `className` and the inline `color` (empty for none). */
  public async expectStatusIcon(className: string, color: string): Promise<void> {
    const readColor = (icon: HTMLElement | SVGElement): string => icon.style.color;
    const inlineColor = async (): Promise<string> => this.statusIcon.evaluate(readColor);

    await expect(this.statusIcon).toHaveAttribute('class', className);
    await expect.poll(inlineColor).toBe(color);
  }
}
