import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { affectedMarkOf } from './affected-mark.util.ts';
import type { AffectedMark } from '../common/affected.type.ts';
import { turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

const MARKS: [string, TaskNode['kind'], boolean, AffectedMark][] = [
  ['TaskFileChanged', 'task', false, 'changed'],
  ['TaskGlobalFileChanged', 'task', false, 'changed'],
  ['TaskGlobalDepsChanged', 'task', false, 'changed'],
  ['TaskBrandNew', 'task', false, 'changed'],
  ['TaskAllChanged', 'task', true, 'changed'],
  ['TaskAllChanged', 'task', false, 'dependency'],
  ['TaskDependencyTaskChanged', 'task', true, 'dependency'],
  ['TaskPackageDependencyChanged', 'task', false, 'dependency'],
  ['TaskFileChanged', 'atom-umbrella', false, 'dependency'],
  ['TaskAllChanged', 'atom-aggregate', true, 'dependency']
];

describe('FEATURE: affected mark', () => {
  describe('GIVEN a reason, a task kind and the sibling flag', () => {
    it.each(MARKS)('WHEN %s on a %s task (file sibling %s) THEN the mark is %s', (reason, kind, hasFileSibling, mark) => {
      const task = turboTaskOf('@fx/a', 'build', { kind });

      expect(affectedMarkOf(task, reason, hasFileSibling)).toBe(mark);
    });
  });
});
