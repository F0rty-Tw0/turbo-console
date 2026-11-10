import { describe, expect, it } from 'vitest';

import { predictionLineOf, predictionWordOf } from './prediction-text.util.ts';
import type { PredictionCache } from '../common/prediction.type.ts';

const SETTLED = new Date(2026, 10, 9, 14, 5).getTime();
const EARLY = new Date(2026, 10, 9, 9, 7).getTime();

const WORDS: [PredictionCache, string][] = [
  ['HIT', 'cached'],
  ['MISS', 'not cached'],
  ['deferred', 'unknown']
];

const LINES: [PredictionCache, string][] = [
  ['HIT', 'Prediction: cached, will replay (as of 14:05)'],
  ['MISS', 'Prediction: not cached, will run (as of 14:05)'],
  ['deferred', 'Prediction: unknown, decided at run time (as of 14:05)']
];

describe('FEATURE: prediction text', () => {
  describe('GIVEN a cache word', () => {
    it.each(WORDS)('WHEN the word of %s is read THEN it is %s', (cache, word) => {
      expect(predictionWordOf(cache)).toBe(word);
    });
  });

  describe('GIVEN a settle time', () => {
    it.each(LINES)('WHEN the line of %s settled at 14:05 local is read THEN it is %s', (cache, line) => {
      expect(predictionLineOf(cache, SETTLED)).toBe(line);
    });

    it('WHEN it is 09:07 local THEN hours and minutes are zero-padded', () => {
      expect(predictionLineOf('HIT', EARLY)).toBe('Prediction: cached, will replay (as of 09:07)');
    });
  });
});
