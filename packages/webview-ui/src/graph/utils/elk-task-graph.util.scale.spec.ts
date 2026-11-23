import { describe, expect, it } from 'vitest';

import { elkTaskGraphOf } from './elk-task-graph.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskNaming } from '../common/graph-task.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import { sizeOf } from '../test/utils/elk-options.spec.util.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const NAMING_UNGROUPED: TaskNaming = { grouped: false, scopeShown: true, labels: new Map(), folders: new Map() };

/** `task` whose every `packageName` read appends the package to `reads`. */
const countedOf = (task: GraphTask, reads: string[]): GraphTask => {
  const { packageName } = task;
  const counted: GraphTask = {
    ...task,
    get packageName(): string {
      reads.push(packageName);

      return packageName;
    }
  };

  return counted;
};

/** One turbo task and one script in each of `packageCount` packages. */
const packagesOf = (packageCount: number): GraphTask[] => {
  const tasksOf = (_slot: unknown, index: number): GraphTask[] => {
    const pair = [taskOf(`p-${index}#build`, []), scriptOf(`p-${index}#lint`, [])];

    return pair;
  };

  return Array.from({ length: packageCount }, tasksOf).flat();
};

describe('FEATURE: elkTaskGraphOf package grouping cost', () => {
  describe('GIVEN 100 packages with one turbo task and one script each', () => {
    it('WHEN the task ELK input is built THEN each task package is read a few times, not once per package', () => {
      const reads: string[] = [];
      const countOf = (task: GraphTask): GraphTask => countedOf(task, reads);
      const tasks = packagesOf(100).map(countOf);
      const ids = tasks.map((task) => task.id);
      const shown = new Set(ids);
      const sizes = new Map<string, NodeSize>();
      const titleWidths = new Map<string, number>();
      const request = { tasks, shown, sizes, titleWidths, naming: NAMING_UNGROUPED };

      elkTaskGraphOf(request, sizeOf);

      expect(reads.length).toBeLessThan(tasks.length * 10);
    });
  });
});
