import { describe, expect, it } from 'vitest';

import { runLogEventOf } from './run-log-event.util.ts';
import { fixtureEntryOf, fixtureEventPairs } from '../test/utils/run-log-event.spec.util.ts';
import { runLogEntryWith } from '../test/utils/run-log-source.spec.util.ts';

describe('FEATURE: classifying a turbo log entry into a task event', () => {
  describe('GIVEN an entry copied from a captured fixture', () => {
    it.each([
      ['g1-live[7] a lib#build command line', { kind: 'seen', taskId: '@acme/lib#build' }, 'g1-live', 7],
      ['g1-live[6] a cache bypass line', { kind: 'seen', taskId: '@acme/lib#build' }, 'g1-live', 6],
      ['g4-hit[6] the cache hit line', { kind: 'cacheHit', taskId: '@acme/lib#hit' }, 'g4-hit', 6],
      ['g4-hit[8] an output line after the cache hit', { kind: 'seen', taskId: '@acme/lib#hit' }, 'g4-hit', 8],
      ['g5-fail[9] the pnpm failure line of the task', { kind: 'seen', taskId: '@acme/lib#fail' }, 'g5-fail', 9],
      ['g5-fail[10] the turbo exited (3) line', null, 'g5-fail', 10],
      ['g1-live[3] a turbo banner line', null, 'g1-live', 3],
      ['g1-live[13] a turbo summary line', null, 'g1-live', 13]
    ])('WHEN %s is classified THEN the event is %o', async (_name, expected, fixture, index) => {
      const entry = await fixtureEntryOf(fixture, index);

      expect(runLogEventOf(entry)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a synthesised entry', () => {
    it.each([
      ['a source with no #', null, runLogEntryWith('lib', 'cache hit, replaying logs abc')],
      ['a turbo source with a cache hit text', null, runLogEntryWith('turbo', 'cache hit, replaying logs abc')],
      ['a root task source', { kind: 'seen', taskId: '//#build' }, runLogEntryWith('//#build', 'out')],
      [
        'a root task cache hit',
        { kind: 'cacheHit', taskId: '//#build' },
        runLogEntryWith('//#build', 'cache hit, replaying logs abc')
      ],
      [
        'a cache hit, suppressing logs line',
        { kind: 'cacheHit', taskId: '@acme/lib#hit' },
        runLogEntryWith('@acme/lib#hit', 'cache hit, suppressing logs abc')
      ],
      [
        'a cache miss line',
        { kind: 'seen', taskId: '@acme/lib#build' },
        runLogEntryWith('@acme/lib#build', 'cache miss, executing abc')
      ],
      [
        'a cache hit text that is not at the line start',
        { kind: 'seen', taskId: '@acme/lib#hit' },
        runLogEntryWith('@acme/lib#hit', 'saw cache hit, replaying logs')
      ]
    ])('WHEN %s is classified THEN the event is %o', (_name, expected, entry) => {
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
