import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { rowAffectedOf } from './row-affected.util.ts';
import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { AFFECTED_VIEW_STUB, CHANGED_LINE_STUB, DEP_LINE_STUB } from '../test/stubs/affected-view.stub.ts';
import { TASK_NODE_STUB } from '../test/stubs/workspace-model.stub.ts';

const taskOf = (id: string, persistent = false): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id, persistent };

  return task;
};

const entryIn = (state: RunState): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, state };

  return entry;
};

const ENDED_STATES: RunState[] = ['passed', 'failed', 'stopped', 'failed-to-start'];

describe('FEATURE: row affected mark', () => {
  describe('GIVEN an idle task', () => {
    it('WHEN its mark is changed THEN the word is affected and the line is the entry line', () => {
      const affected = rowAffectedOf(taskOf('a#build'), undefined, AFFECTED_VIEW_STUB);

      expect(affected).toStrictEqual({ word: 'affected', line: CHANGED_LINE_STUB });
    });

    it('WHEN its mark is dependency THEN the word is affected via dependency', () => {
      const affected = rowAffectedOf(taskOf('a#test'), undefined, AFFECTED_VIEW_STUB);

      expect(affected).toStrictEqual({ word: 'affected via dependency', line: DEP_LINE_STUB });
    });

    it('WHEN there is no view THEN there is no mark', () => {
      expect(rowAffectedOf(taskOf('a#build'), undefined, null)).toBeNull();
    });

    it('WHEN the view lacks the id THEN there is no mark', () => {
      expect(rowAffectedOf(taskOf('a#lint'), undefined, AFFECTED_VIEW_STUB)).toBeNull();
    });

    it('WHEN the task is continuous THEN the word stays', () => {
      const affected = rowAffectedOf(taskOf('a#build', true), undefined, AFFECTED_VIEW_STUB);

      expect(affected?.word).toBe('affected');
    });
  });

  describe('GIVEN a live run', () => {
    it('WHEN the task is affected THEN the word is null and the line stays', () => {
      const affected = rowAffectedOf(taskOf('a#build'), entryIn('running'), AFFECTED_VIEW_STUB);

      expect(affected).toStrictEqual({ word: null, line: CHANGED_LINE_STUB });
    });

    it('WHEN the task is continuous THEN the word is null and the line stays', () => {
      const affected = rowAffectedOf(taskOf('a#build', true), entryIn('running'), AFFECTED_VIEW_STUB);

      expect(affected).toStrictEqual({ word: null, line: CHANGED_LINE_STUB });
    });
  });

  describe('GIVEN an ended run', () => {
    it.each(ENDED_STATES)('WHEN the state is %s THEN the word stays', (state) => {
      const affected = rowAffectedOf(taskOf('a#build'), entryIn(state), AFFECTED_VIEW_STUB);

      expect(affected?.word).toBe('affected');
    });
  });
});
