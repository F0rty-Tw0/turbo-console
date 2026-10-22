import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import type { GuideLine } from '../../common/graph.type.ts';

/** One guide item holds the line's icon, its name and its copy. */
export const expectGuideLine = async (item: Locator, line: GuideLine): Promise<void> => {
  await expect(item.locator('span').first()).toHaveClass(new RegExp(`codicon-${line.icon}`));
  await expect(item.locator('strong')).toHaveText(line.name);
  await expect(item.locator('p')).toHaveText(line.text);
};
