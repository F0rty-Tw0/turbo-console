import { describe, expect, it } from 'vitest';

import { predictionClassOf } from './prediction-class.util.ts';

describe('FEATURE: prediction class', () => {
  describe.each([
    ['cached', 'predict-cached'],
    ['notCached', 'predict-notCached'],
    ['unknown', 'predict-unknown']
  ] as const)('GIVEN the word %s', (word, name) => {
    it(`WHEN its class is read THEN it is ${name}`, () => {
      expect(predictionClassOf(word)).toBe(name);
    });
  });
});
