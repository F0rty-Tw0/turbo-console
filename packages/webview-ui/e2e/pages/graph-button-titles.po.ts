import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Class and name of every button whose `title` is empty, 80 characters each; self-contained, it runs in the page. */
const untitledStartsOf = (buttons: Element[]): string[] => {
  const untitled = buttons.filter((button): boolean => button instanceof HTMLElement && button.title === '');
  const describe = (button: Element): string => {
    const name = button.getAttribute('aria-label') ?? button.textContent;
    const description = `${button.className}: ${name}`;

    return description.slice(0, 80);
  };

  return untitled.map(describe);
};

/** The hover titles of the graph page's buttons: a visible button without one is listed by its markup. */
export class GraphButtonTitles {
  private readonly buttons: Locator;
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
    this.buttons = page.locator('button:visible');
  }

  public async untitled(): Promise<string[]> {
    return this.buttons.evaluateAll(untitledStartsOf);
  }

  /** Every visible button has a title; `step` names the page state in the failure. */
  public async expectAllTitled(step: string): Promise<void> {
    await expect.poll(async (): Promise<string[]> => this.untitled(), { message: step }).toEqual([]);
  }

  /** The button named exactly `name` has the same text as its title. */
  public async expectTitledAs(name: string): Promise<void> {
    await expect(this.page.getByRole('button', { name, exact: true })).toHaveAttribute('title', name);
  }
}
