import { describe, expect, it } from 'vitest';

import { cardMarginXOf, cardRowsOf, cardStateWordOf } from './card-label.util.ts';

const BLANK = String.fromCodePoint(0xec03);
const HISTORY = String.fromCodePoint(0xea82);
const SYNC = String.fromCodePoint(0xea77);
const PULSE = String.fromCodePoint(0xeb31);
const PASS = String.fromCodePoint(0xeba4);
const ERROR = String.fromCodePoint(0xea87);
const STOP = String.fromCodePoint(0xead7);

describe('FEATURE: card label', () => {
  describe('cardMarginXOf', () => {
    it.each([
      [105, 180, -25.5],
      [156, 180, 0],
      [294, 360, -21]
    ])('GIVEN a %d px block in a %d px card THEN the margin is %d', (block, card, margin) => {
      expect(cardMarginXOf(block, card)).toBe(margin);
    });
  });

  describe('cardStateWordOf', () => {
    it.each([
      [['task', 'task-card'], 'Not run'],
      [['task', 'run-running'], 'Running'],
      [['task', 'run-continuous'], 'Continuous'],
      [['task', 'run-passed'], 'Passed'],
      [['task', 'run-failed'], 'Failed'],
      [['task', 'run-stopped'], 'Stopped'],
      [['task', 'run-failed-to-start'], 'Failed to start'],
      [['task', 'predict-cached'], 'Not run']
    ])('GIVEN the classes %j THEN the word is %s', (classes, word) => {
      expect(cardStateWordOf(classes)).toBe(word);
    });
  });

  describe('cardRowsOf', () => {
    it('GIVEN no run and a glyph font THEN row 1 is the blank glyph and the name, row 2 is Not run', () => {
      expect(cardRowsOf(['task'], 'build', true)).toStrictEqual([`${BLANK} build`, 'Not run']);
    });

    it.each([
      ['run-running', SYNC, 'Running'],
      ['run-continuous', PULSE, 'Continuous'],
      ['run-passed', PASS, 'Passed'],
      ['run-failed', ERROR, 'Failed'],
      ['run-stopped', STOP, 'Stopped'],
      ['run-failed-to-start', ERROR, 'Failed to start']
    ])('GIVEN %s THEN row 1 starts with its glyph and row 2 is %s', (run, glyph, word) => {
      expect(cardRowsOf(['task', run], 'build', true)).toStrictEqual([`${glyph} build`, word]);
    });

    it('GIVEN a cached prediction and no run THEN row 1 has the history glyph and row 2 stays Not run', () => {
      expect(cardRowsOf(['task', 'predict-cached'], 'build', true)).toStrictEqual([`${HISTORY} build`, 'Not run']);
    });

    it('GIVEN a live run and a prediction THEN the running glyph and Running win', () => {
      const rows = cardRowsOf(['task', 'run-running', 'predict-cached'], 'build', true);

      expect(rows).toStrictEqual([`${SYNC} build`, 'Running']);
    });

    it('GIVEN no glyph font THEN row 1 is the bare name', () => {
      expect(cardRowsOf(['task', 'run-passed'], 'build', false)).toStrictEqual(['build', 'Passed']);
    });
  });

  describe('cardRowsOf with a clock', () => {
    it.each([
      [['task', 'run-running'], '1m 4s', 'Running · 1m 4s'],
      [['task', 'run-continuous'], '1h 2m', 'Continuous · 1h 2m'],
      [['task', 'run-passed'], '1m 4s', 'Passed'],
      [['task', 'run-failed'], '1m 4s', 'Failed'],
      [['task', 'run-stopped'], '1m 4s', 'Stopped'],
      [['task', 'run-failed-to-start'], '1m 4s', 'Failed to start'],
      [['task'], '1m 4s', 'Not run'],
      [['task', 'run-running'], undefined, 'Running']
    ])('GIVEN the classes %j and clock %s THEN row 2 is %s', (classes, clock, row2) => {
      expect(cardRowsOf(classes, 'build', false, clock)[1]).toBe(row2);
    });

    it('GIVEN a live run and a clock THEN row 1 is the running glyph and the name', () => {
      expect(cardRowsOf(['task', 'run-running'], 'build', true, '1m 4s')[0]).toBe(`${SYNC} build`);
    });
  });
});
