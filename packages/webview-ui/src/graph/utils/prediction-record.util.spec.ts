import { describe, expect, it } from 'vitest';

import { predictionRecordOf } from './prediction-record.util.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import { NO_PREDICTIONS } from '../common/graph-task.const.ts';

const MIXED = { 'a#x': 'cached', 'b#y': 'bogus', 'c#z': 7 };

const VALID = { 'a#x': 'notCached', 'b#y': 'unknown' };

const entryOf = (_: unknown, index: number): [string, string] => [`p#t${index}`, 'cached'];

describe('FEATURE: predictionRecordOf', () => {
  describe('GIVEN the predictions field of a runs message', () => {
    it('WHEN it is absent THEN it is null, so the marks stay', () => {
      expect(predictionRecordOf(undefined)).toBeNull();
    });

    it.each([
      ['a number', 5, {}],
      ['null', null, {}],
      ['an array', ['cached'], {}],
      ['an object with bad words', MIXED, { 'a#x': 'cached' }],
      ['an object of known words', VALID, VALID]
    ])('WHEN it is %s THEN the record keeps only its known words', (_name, value, record) => {
      expect(predictionRecordOf(value)).toStrictEqual(record);
    });

    it.each([
      ['empty', {}],
      ['only bad words', { 'b#y': 'bogus' }]
    ])('WHEN it is %s THEN it is the shared empty record, so the view skips it', (_name, value) => {
      expect(predictionRecordOf(value)).toBe(NO_PREDICTIONS);
    });

    it('WHEN it has more than TASK_COUNT_MAX entries THEN it is the empty record', () => {
      const entries = Array.from({ length: TASK_COUNT_MAX + 1 }, entryOf);
      const huge = Object.fromEntries(entries);

      expect(predictionRecordOf(huge)).toStrictEqual({});
    });

    it('WHEN it has exactly TASK_COUNT_MAX entries THEN every entry is kept', () => {
      const entries = Array.from({ length: TASK_COUNT_MAX }, entryOf);
      const full = Object.fromEntries(entries);

      expect(Object.keys(predictionRecordOf(full) ?? {})).toHaveLength(TASK_COUNT_MAX);
    });

    it('WHEN it parses a __proto__ key THEN the key stays plain data', () => {
      const parsed: unknown = JSON.parse('{"__proto__":"cached"}');
      const record = predictionRecordOf(parsed) ?? {};

      expect(Object.hasOwn(record, '__proto__')).toBe(true);
    });
  });
});
