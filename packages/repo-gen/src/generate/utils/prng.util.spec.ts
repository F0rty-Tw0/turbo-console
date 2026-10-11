import { describe, expect, it } from 'vitest';

import { createPrng, pickRandom } from './prng.util.ts';

describe('FEATURE: seeded PRNG', () => {
  describe('GIVEN two generators with the same seed', () => {
    it('WHEN each draws five values THEN the sequences are equal', () => {
      const first = createPrng(42);
      const second = createPrng(42);

      const values = Array.from({ length: 5 }, first);
      const otherValues = Array.from({ length: 5 }, second);

      expect(values).toStrictEqual(otherValues);
    });
  });

  describe('GIVEN two generators with different seeds', () => {
    it('WHEN each draws five values THEN the sequences differ', () => {
      const first = createPrng(1);
      const second = createPrng(2);

      const values = Array.from({ length: 5 }, first);
      const otherValues = Array.from({ length: 5 }, second);

      expect(values).not.toStrictEqual(otherValues);
    });
  });

  describe('GIVEN seed 1', () => {
    it('WHEN a thousand values are drawn THEN every value is in [0, 1)', () => {
      const random = createPrng(1);

      const values = Array.from({ length: 1000 }, random);

      expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    });

    it('WHEN the first value is drawn THEN it matches the mulberry32 reference output', () => {
      const random = createPrng(1);

      const value = random();

      expect(value).toBe(0.6270739405881613);
    });
  });
});

describe('FEATURE: random pick without replacement', () => {
  describe('GIVEN ten items', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

    it('WHEN four are picked THEN four distinct items from the input come back', () => {
      const random = createPrng(3);

      const picked = pickRandom(items, 4, random);

      expect(new Set(picked).size).toBe(4);
      expect(picked.every((item) => items.includes(item))).toBe(true);
    });

    it('WHEN zero are picked THEN the result is empty', () => {
      const random = createPrng(3);

      const picked = pickRandom(items, 0, random);

      expect(picked).toStrictEqual([]);
    });

    it('WHEN all are picked THEN the input array is left unchanged', () => {
      const input = [...items];
      const random = createPrng(3);

      pickRandom(input, 10, random);

      expect(input).toStrictEqual(items);
    });

    it('WHEN two generators with the same seed pick THEN the picks are equal', () => {
      const first = createPrng(9);
      const second = createPrng(9);

      const picked = pickRandom(items, 5, first);
      const otherPicked = pickRandom(items, 5, second);

      expect(picked).toStrictEqual(otherPicked);
    });
  });
});
