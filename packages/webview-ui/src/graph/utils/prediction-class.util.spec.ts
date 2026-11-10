import { describe, expect, it } from 'vitest';

import { predictionClassOf } from './prediction-class.util.ts';

describe('FEATURE: prediction class', () => {
  it.each([
    ['cached', 'predict-cached'],
    ['notCached', 'predict-notCached'],
    ['unknown', 'predict-unknown']
  ] as const)('GIVEN the word %s WHEN its class is read THEN it is %s', (word, name) => {
    expect(predictionClassOf(word)).toBe(name);
  });
});
