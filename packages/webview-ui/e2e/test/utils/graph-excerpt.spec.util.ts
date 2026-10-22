import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import type { ExcerptRow } from '../../../src/graph/common/details.type.ts';

/** Runs in the page through `evaluate`: the excerpt marks the entry's own row. */
const isMarkedRow = (element: Element): boolean => element.classList.contains('is-entry');

/** One excerpt row: a line-number cell, a text cell read raw (inner spaces count), and the mark on the entry's own row. */
export const expectExcerptRow = async (line: Locator, row: ExcerptRow): Promise<void> => {
  const cells = line.locator('span');

  await expect(cells.nth(0)).toHaveText(String(row.number));
  await expect.poll(async (): Promise<string | null> => cells.nth(1).textContent()).toBe(row.text);
  await expect.poll(async (): Promise<boolean> => line.evaluate(isMarkedRow)).toBe(row.isEntry);
};
