import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const HAS_CODICON_STYLESHEET = `[...document.styleSheets].some((sheet) => sheet.href?.endsWith('/codicon.css') === true)`;

/** The icons the graph page draws, read as the user would see them. */
export class GraphIcons {
  private readonly page: Page;

  public constructor(page: Page) {
    this.page = page;
  }

  public async expectCodiconStylesheet(): Promise<void> {
    const hasStylesheet = async (): Promise<boolean> => this.page.evaluate<boolean>(HAS_CODICON_STYLESHEET);

    await expect.poll(hasStylesheet).toBe(true);
  }
}
