import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/** One trace step: its name; a name button when it is visible; "hidden" and, when showable, a Show button when it is not. */
export const expectTraceStep = async (item: Locator, name: string, isHidden: boolean, isShowable: boolean): Promise<void> => {
  const buttonCount = isHidden ? 0 : 1;
  const showCount = isHidden && isShowable ? 1 : 0;

  await expect(item.getByText(name, { exact: true })).toBeVisible();
  await expect(item.getByRole('button', { name, exact: true })).toHaveCount(buttonCount);
  await expect(item.getByText('hidden', { exact: true })).toBeVisible({ visible: isHidden });
  await expect(item.getByRole('button', { name: `Show ${name}`, exact: true })).toHaveCount(showCount);
};
