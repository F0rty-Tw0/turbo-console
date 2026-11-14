import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { TASK_COUNT_MAX } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunsMessage } from '../../bridge/common/graph-message.type.ts';

/** Parsed, so `__proto__` and `constructor` arrive as own keys, as they would from a posted message. */
const PROTOTYPE_NAMED: unknown = JSON.parse('{"__proto__":5,"constructor":0}');

const BUILD_RUNNING: GraphRunsMessage['runs'] = { 'ui#build': 'running' };

const BUILD_ELAPSED: GraphRunsMessage['elapsed'] = { 'ui#build': 64_000 };

/** Pins the wire type: this literal must typecheck, so `elapsed` is a key of `GraphRunsMessage`. */
const TYPED: GraphRunsMessage = { type: 'runs', runs: BUILD_RUNNING, elapsed: BUILD_ELAPSED };

const runsWith = (elapsed: unknown): unknown => {
  const message = { type: 'runs', runs: BUILD_RUNNING, elapsed };

  return message;
};

const entryOf = (_: unknown, index: number): [string, number] => [`p#t${index}`, 0];

const elapsedOf = (length: number): Record<string, number> => {
  const entries = Array.from({ length }, entryOf);

  return Object.fromEntries(entries);
};

describe('FEATURE: the elapsed key of a runs message', () => {
  describe('GIVEN a runs message', () => {
    it.each([
      ['no elapsed key', { type: 'runs', runs: {} }],
      ['elapsed: undefined', runsWith(undefined)],
      ['an empty elapsed', runsWith({})],
      ['a finite elapsed', TYPED],
      ['zero and a fraction', runsWith({ a: 0, b: 1.5 })],
      ['elapsed keyed like Object.prototype members', runsWith(PROTOTYPE_NAMED)],
      ['exactly TASK_COUNT_MAX elapsed keys', runsWith(elapsedOf(TASK_COUNT_MAX))]
    ])('WHEN it carries %s THEN it is accepted', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(true);
    });

    it.each([
      ['a string', runsWith('64000')],
      ['null', runsWith(null)],
      ['an array', runsWith([1])],
      ['a string value', runsWith({ a: '5' })],
      ['a NaN value', runsWith({ a: Number.NaN })],
      ['an Infinity value', runsWith({ a: Number.POSITIVE_INFINITY })],
      ['a negative value', runsWith({ a: -1 })],
      ['a null value', runsWith({ a: null })],
      ['more than TASK_COUNT_MAX keys', runsWith(elapsedOf(TASK_COUNT_MAX + 1))]
    ])('WHEN its elapsed is %s THEN it is rejected', (_name, raw) => {
      const isMessage = isGraphHostMessage(raw);

      expect(isMessage).toBe(false);
    });
  });
});
