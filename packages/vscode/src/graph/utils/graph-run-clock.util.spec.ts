import type { GraphRunsMessage } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { runsTextOf, withElapsedOf } from './graph-run-clock.util.ts';

const BUILD_RUNS: GraphRunsMessage['runs'] = { 'ui#build': 'running' };
const MESSAGE: GraphRunsMessage = { type: 'runs', runs: BUILD_RUNS };
const BUILD_LAUNCH = { 'ui#build': 1000 };

describe('FEATURE: the clock of the own live runs in a runs message', () => {
  describe('GIVEN a runs message', () => {
    it('WHEN no run is launched THEN the same message comes back', () => {
      const clocked = withElapsedOf(MESSAGE, {}, 65_000);

      expect(clocked).toBe(MESSAGE);
    });

    it.each([
      [65_000, 64_000],
      [500, 0]
    ])('WHEN ui#build launched at 1000 is read at %d THEN its elapsed is %d', (wallNow, ms) => {
      const clocked = withElapsedOf(MESSAGE, BUILD_LAUNCH, wallNow);

      expect(clocked.elapsed).toStrictEqual({ 'ui#build': ms });
    });

    it('WHEN its dedupe text is taken twice with a different elapsed THEN both texts are equal', () => {
      const early = withElapsedOf(MESSAGE, BUILD_LAUNCH, 2000);
      const late = withElapsedOf(MESSAGE, BUILD_LAUNCH, 9000);

      expect(runsTextOf(early, BUILD_LAUNCH)).toBe(runsTextOf(late, BUILD_LAUNCH));
    });

    it('WHEN its dedupe text is taken with another launch THEN the texts differ', () => {
      const relaunched = { 'ui#build': 1020 };

      expect(runsTextOf(MESSAGE, BUILD_LAUNCH)).not.toBe(runsTextOf(MESSAGE, relaunched));
    });
  });
});
