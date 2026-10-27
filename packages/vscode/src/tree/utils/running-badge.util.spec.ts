import { describe, expect, it } from 'vitest';

import { runningBadgeOf } from './running-badge.util.ts';

describe('FEATURE: running badge value', () => {
  it('GIVEN no run WHEN the badge is read THEN there is none', () => {
    const badge = runningBadgeOf(0);

    expect(badge).toBeUndefined();
  });

  it.each([1, 2])('GIVEN %i runs WHEN the badge is read THEN it shows the count and says so', (count) => {
    const badge = runningBadgeOf(count);

    expect(badge).toStrictEqual({ value: count, tooltip: `${count} running` });
  });
});
