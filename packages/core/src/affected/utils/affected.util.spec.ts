import { describe, expect, it } from 'vitest';

import { affectedVariables, toAffectedResult } from './affected.util.ts';
import type { AffectedTasks } from '../../shared/turbo/common/turbo.type.ts';
import type { AffectedTask } from '../common/affected.type.ts';

type ChangedTask = AffectedTasks['data']['affectedTasks']['items'][number];

// eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
const FILE_CHANGED = { __typename: 'TaskFileChanged' };

// eslint-disable-next-line @typescript-eslint/naming-convention -- GraphQL's own `__typename` key, copied from turbo's output.
const ALL_CHANGED = { __typename: 'TaskAllChanged' };

const INVALID_ARGUMENT = { kind: 'invalid-argument' };

const WEB_TEST: ChangedTask = { fullName: 'web#test', reason: FILE_CHANGED };

const UI_BUILD: ChangedTask = { fullName: 'ui#build', reason: ALL_CHANGED };

const WEB_BUILD: ChangedTask = { fullName: 'web#build', reason: FILE_CHANGED };

const affectedJson = (items: ChangedTask[]): AffectedTasks => {
  const affectedTasks = { items };
  const data = { affectedTasks };
  const json: AffectedTasks = { data };

  return json;
};

const SORTED_TASKS: AffectedTask[] = [
  { id: 'ui#build', reason: 'TaskAllChanged' },
  { id: 'web#build', reason: 'TaskFileChanged' },
  { id: 'web#test', reason: 'TaskFileChanged' }
];

describe('FEATURE: affected tasks result', () => {
  describe('GIVEN turbo lists affected tasks out of id order', () => {
    const json = affectedJson([WEB_TEST, UI_BUILD, WEB_BUILD]);

    it('WHEN converted THEN tasks are sorted by id, each with its reason typename', () => {
      const result = toAffectedResult(json, 'task');

      expect(result.tasks).toStrictEqual(SORTED_TASKS);
    });

    it('WHEN converted in package mode THEN the mode is kept', () => {
      const result = toAffectedResult(json, 'package');

      expect(result.mode).toBe('package');
    });
  });

  describe('GIVEN turbo lists no affected task', () => {
    it('WHEN converted THEN tasks are empty', () => {
      const result = toAffectedResult(affectedJson([]), 'task');

      expect(result).toStrictEqual({ mode: 'task', tasks: [] });
    });
  });
});

describe('FEATURE: affected query variables', () => {
  describe('GIVEN both refs', () => {
    it('WHEN turned into variables THEN both are passed', () => {
      const variables = affectedVariables({ base: 'HEAD~1', head: 'HEAD' });

      expect(variables).toStrictEqual({ base: 'HEAD~1', head: 'HEAD' });
    });
  });

  describe('GIVEN only base', () => {
    it('WHEN turned into variables THEN only base is passed', () => {
      const variables = affectedVariables({ base: 'main', head: undefined });

      expect(variables).toStrictEqual({ base: 'main' });
    });
  });

  describe('GIVEN only head', () => {
    it('WHEN turned into variables THEN only head is passed', () => {
      const variables = affectedVariables({ head: 'HEAD' });

      expect(variables).toStrictEqual({ head: 'HEAD' });
    });
  });

  describe('GIVEN no ref, only a signal', () => {
    it('WHEN turned into variables THEN there are none, so no -V file is written', () => {
      const variables = affectedVariables({ signal: AbortSignal.abort() });

      expect(variables).toBeUndefined();
    });
  });

  describe('GIVEN git refs of every common shape', () => {
    it.each(['HEAD~1', 'origin/main', 'v1.2.3', 'abc123^'])('WHEN %s is the base THEN it is passed as it is', (ref) => {
      const variables = affectedVariables({ base: ref });

      expect(variables).toStrictEqual({ base: ref });
    });
  });

  describe('GIVEN a ref turbo could misread', () => {
    it('WHEN a base starting with - is turned into variables THEN it throws invalid-argument', () => {
      expect(() => affectedVariables({ base: '-x' })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });

    it('WHEN a head holding a control character is turned into variables THEN it throws invalid-argument', () => {
      expect(() => affectedVariables({ base: 'HEAD~1', head: 'HEAD\n' })).toThrow(expect.objectContaining(INVALID_ARGUMENT));
    });
  });
});
