import { describe, expect, it } from 'vitest';

import { shouldKeepClear } from './keep-clear-trigger.util.ts';
import type { KeepClearTrigger } from '../common/keep-clear.type.ts';

describe('FEATURE: shouldKeepClear', () => {
  describe('GIVEN a trigger, the overlay mode and the panel state', () => {
    it.each<[KeepClearTrigger, boolean, boolean, boolean]>([
      ['input', true, true, true],
      ['filter', true, true, true],
      ['opened', true, true, true],
      ['layout', true, true, true],
      ['input', false, true, false],
      ['input', true, false, false],
      ['restore', true, true, false],
      ['refresh', true, true, false]
    ])('WHEN %s with overlay %s and open %s THEN it pans: %s', (trigger, isOverlay, isOpen, expected) => {
      const isPan = shouldKeepClear(trigger, isOverlay, isOpen);

      expect(isPan).toBe(expected);
    });
  });
});
