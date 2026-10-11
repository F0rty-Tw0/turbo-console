import { test as base } from '@playwright/test';

import { ShellPage } from './pages/shell.po.ts';

type ShellFixtures = {
  readonly shellPage: ShellPage;
};

export const test = base.extend<ShellFixtures>({
  shellPage: async ({ page }, use): Promise<void> => {
    await use(new ShellPage(page));
  }
});
