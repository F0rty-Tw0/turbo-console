import { test as base } from '@playwright/test';

import { ShellStall } from './pages/shell-stall.po.ts';

type ShellStallFixtures = {
  readonly shellStall: ShellStall;
};

export const test = base.extend<ShellStallFixtures>({
  shellStall: async ({ page }, use, testInfo): Promise<void> => {
    await use(new ShellStall(page, testInfo));
  }
});
