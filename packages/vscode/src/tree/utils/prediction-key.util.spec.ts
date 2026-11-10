import { describe, expect, it } from 'vitest';

import { predictionKeyOf } from './prediction-key.util.ts';

describe('FEATURE: prediction key', () => {
  describe('GIVEN a root and a package name', () => {
    it('WHEN the same pair is keyed twice THEN the keys are equal', () => {
      expect(predictionKeyOf('/ws', '@fx/a')).toBe(predictionKeyOf('/ws', '@fx/a'));
    });

    it('WHEN the pair splits at another place THEN the keys differ', () => {
      expect(predictionKeyOf('/ws/a', 'b')).not.toBe(predictionKeyOf('/ws', 'a/b'));
    });
  });
});
