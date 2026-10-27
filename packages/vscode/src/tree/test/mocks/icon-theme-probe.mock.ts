import { vi } from 'vitest';

import type { IconThemeProbe } from '../../common/icon-theme.type.ts';

/** An `IconThemeProbe` of spies that never knows the theme: `has()` resolves `null`. */
export const iconThemeProbeMock = (): IconThemeProbe => {
  const probe: IconThemeProbe = { has: vi.fn(async () => Promise.resolve(null)), clear: vi.fn() };

  return probe;
};
