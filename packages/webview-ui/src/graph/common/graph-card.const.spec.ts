import { describe, expect, it } from 'vitest';

import {
  CARD_HEIGHT,
  CARD_IDLE_TEXT,
  CARD_LINE_HEIGHT,
  CARD_MIN_WIDTH,
  CARD_PADDING_X,
  CARD_STATE_WORDS,
  TASK_CARD_CLASS
} from './graph-card.const.ts';
import { RUN_STATE_TEXT } from './graph-task.const.ts';

describe('FEATURE: graph-card.const', () => {
  describe('GIVEN the card constants', () => {
    it('THEN the size numbers are the spec numbers', () => {
      expect([CARD_HEIGHT, CARD_MIN_WIDTH, CARD_PADDING_X, CARD_LINE_HEIGHT]).toStrictEqual([60, 180, 24, 1.4]);
    });

    it('THEN the idle text is Not run', () => {
      expect(CARD_IDLE_TEXT).toBe('Not run');
    });

    it('THEN the card class is task-card', () => {
      expect(TASK_CARD_CLASS).toBe('task-card');
    });

    it('THEN the state words are the six run state words and the idle text', () => {
      const words = CARD_STATE_WORDS.toSorted();
      const expected = Object.values(RUN_STATE_TEXT).concat('Not run').toSorted();

      expect(words).toStrictEqual(expected);
    });

    it('THEN the state words are frozen, so no consumer can change the card width in place', () => {
      expect(Object.isFrozen(CARD_STATE_WORDS)).toBe(true);
    });
  });
});
