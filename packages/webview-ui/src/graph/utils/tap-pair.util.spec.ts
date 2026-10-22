import { beforeEach, describe, expect, it } from 'vitest';

import { tapPairOf } from './tap-pair.util.ts';

describe('FEATURE: tapPairOf', () => {
  let noteTap: (id: string | null, at: number) => boolean;

  beforeEach(() => {
    noteTap = tapPairOf();
  });

  describe('GIVEN a tap on b at 1000 ms', () => {
    beforeEach(() => {
      noteTap('b', 1000);
    });

    it.each([
      { at: 1100, isDouble: true },
      { at: 1250, isDouble: true },
      { at: 1251, isDouble: false },
      { at: 999, isDouble: false }
    ])('WHEN b is tapped again at $at ms THEN the tap is a double: $isDouble', ({ at, isDouble }) => {
      const result = noteTap('b', at);

      expect(result).toBe(isDouble);
    });

    it('WHEN a is tapped 100 ms later THEN the tap is no double', () => {
      const result = noteTap('a', 1100);

      expect(result).toBe(false);
    });

    it('WHEN b is tapped twice more, 100 ms apart THEN the third tap is no double', () => {
      noteTap('b', 1100);

      const third = noteTap('b', 1200);

      expect(third).toBe(false);
    });
  });

  describe('GIVEN a tap on nothing at 1000 ms', () => {
    it('WHEN nothing is tapped again 100 ms later THEN the tap is no double', () => {
      noteTap(null, 1000);

      const result = noteTap(null, 1100);

      expect(result).toBe(false);
    });
  });
});
