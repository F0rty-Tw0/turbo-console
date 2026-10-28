import { vi } from 'vitest';

import { UNKNOWN_FACTS } from '../../common/icon-theme.const.ts';
import type { IconThemeProbe } from '../../common/icon-theme.type.ts';

/** An `IconThemeProbe` of spies that never knows the theme: `facts()` resolves `UNKNOWN_FACTS`. */
export const iconThemeProbeMock = (): IconThemeProbe => {
  const probe: IconThemeProbe = { facts: vi.fn(async () => Promise.resolve(UNKNOWN_FACTS)), clear: vi.fn() };

  return probe;
};
