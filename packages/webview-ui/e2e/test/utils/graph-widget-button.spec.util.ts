import type { Locator } from '@playwright/test';
import { expect } from '@playwright/test';

import type { WidgetButtonLook } from '../../common/graph-widget-button.type.ts';

/** The button is a 24 px circle with a 1 px border in `look.border` over the opaque base `look.background`. */
export const expectRoundBordered = async (button: Locator, look: WidgetButtonLook): Promise<void> => {
  await expect(button).toHaveCSS('border-top-left-radius', '50%');
  await expect(button).toHaveCSS('border-top-width', '1px');
  await expect(button).toHaveCSS('border-top-color', look.border);
  await expect(button).toHaveCSS('width', '24px');
  await expect(button).toHaveCSS('background-color', look.background);
};
