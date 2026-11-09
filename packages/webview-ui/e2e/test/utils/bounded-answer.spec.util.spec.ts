import { describe, expect, it } from 'vitest';

import { boundedAnswer } from './bounded-answer.spec.util.ts';

const BOUND_MS = 20;

describe('FEATURE: boundedAnswer', () => {
  describe('GIVEN an answer inside the bound', () => {
    it('WHEN it is awaited THEN it resolves to that answer', async () => {
      const answering = Promise.resolve('answered');
      const result = await boundedAnswer(answering, BOUND_MS, 'too slow');

      expect(result).toBe('answered');
    });
  });

  describe('GIVEN a rejection inside the bound', () => {
    it('WHEN it is awaited THEN it rejects with that error', async () => {
      const failure = new Error('page closed');
      const answering = Promise.reject(failure);

      await expect(boundedAnswer(answering, BOUND_MS, 'too slow')).rejects.toBe(failure);
    });
  });

  describe('GIVEN no answer at all', () => {
    it('WHEN the bound passes THEN it rejects with the message', async () => {
      const answering = new Promise<never>(() => undefined);

      await expect(boundedAnswer(answering, BOUND_MS, 'too slow')).rejects.toThrow('too slow');
    });
  });
});
