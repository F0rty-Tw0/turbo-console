import type { Locator } from '@playwright/test';

/** The `dt` of fact `term` in `card`, by its exact text; a chip or a value with the same words is never matched. */
export const factTermOf = (card: Locator, term: string): Locator => card.locator('dt').getByText(term, { exact: true });

/** The `dd` after fact `term`'s `dt`. */
export const factValueOf = (card: Locator, term: string): Locator => factTermOf(card, term).locator('+ dd');
