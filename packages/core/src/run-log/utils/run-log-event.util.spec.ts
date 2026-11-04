import { describe, expect, it } from 'vitest';

import { runLogEventOf } from './run-log-event.util.ts';
import { entryWith, fixtureEntryOf, fixtureEventPairs } from '../test/utils/run-log-event.spec.util.ts';

describe('FEATURE: classifying a turbo log entry into a task event', () => {
  describe('GIVEN an entry copied from a captured fixture', () => {
    it.each([
      ['g1-live[7] a lib#build command line', 'g1-live', 7, { kind: 'seen', taskId: '@acme/lib#build' }],
      ['g1-live[6] a cache bypass line', 'g1-live', 6, { kind: 'seen', taskId: '@acme/lib#build' }],
      ['g4-hit[6] the cache hit line', 'g4-hit', 6, { kind: 'cacheHit', taskId: '@acme/lib#hit' }],
      ['g4-hit[8] an output line after the cache hit', 'g4-hit', 8, { kind: 'seen', taskId: '@acme/lib#hit' }],
      ['g5-fail[9] the pnpm failure line of the task', 'g5-fail', 9, { kind: 'seen', taskId: '@acme/lib#fail' }],
      ['g5-fail[10] the turbo exited (3) line', 'g5-fail', 10, null],
      ['g1-live[3] a turbo banner line', 'g1-live', 3, null],
      ['g1-live[13] a turbo summary line', 'g1-live', 13, null]
    ])('GIVEN %s WHEN classified THEN the event is the expected one', async (_name, fixture, index, expected) => {
      const entry = await fixtureEntryOf(fixture, index);

      expect(runLogEventOf(entry)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a synthesised entry', () => {
    it.each([
      ['a source with no #', entryWith('lib', 'cache hit, replaying logs abc'), null],
      ['a turbo source with a cache hit text', entryWith('turbo', 'cache hit, replaying logs abc'), null],
      ['a root task source', entryWith('//#build', 'out'), { kind: 'seen', taskId: '//#build' }],
      ['a root task cache hit', entryWith('//#build', 'cache hit, replaying logs abc'), { kind: 'cacheHit', taskId: '//#build' }],
      [
        'a cache hit, suppressing logs line',
        entryWith('@acme/lib#hit', 'cache hit, suppressing logs abc'),
        { kind: 'cacheHit', taskId: '@acme/lib#hit' }
      ],
      ['a cache miss line', entryWith('@acme/lib#build', 'cache miss, executing abc'), { kind: 'seen', taskId: '@acme/lib#build' }],
      [
        'a cache hit text that is not at the line start',
        entryWith('@acme/lib#hit', 'saw cache hit, replaying logs'),
        { kind: 'seen', taskId: '@acme/lib#hit' }
      ]
    ])('GIVEN %s WHEN classified THEN the event is the expected one', (_name, entry, expected) => {
      expect(runLogEventOf(entry)).toStrictEqual(expected);
    });
  });

  describe('GIVEN every entry of a captured fixture', () => {
    it.each([
      ['g1-live', ['@acme/app#build seen', '@acme/lib#build seen']],
      ['g4-hit', ['@acme/lib#hit cacheHit', '@acme/lib#hit seen']],
      ['g5-fail', ['@acme/lib#fail seen']],
      ['g6-stop', ['@acme/lib#build seen']]
    ])('WHEN all entries of %s are classified THEN the (taskId, kind) set is %o', async (fixture, expected) => {
      const pairs = await fixtureEventPairs(fixture);

      expect(pairs).toStrictEqual(expected);
    });
  });
});
