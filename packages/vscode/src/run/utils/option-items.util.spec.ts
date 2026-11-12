import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { optionItemsOf } from './option-items.util.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { OptionItem, RunOption } from '../common/run-options.type.ts';

const item = (label: string, description: string, option: RunOption): OptionItem => {
  const result: OptionItem = { label, description, option };

  return result;
};
const FORCE = item('Without cache', '--force', 'force');
const ONLY = item('Only this task', '--only, skips its dependencies', 'only');
const KEEP = item('Keep going after a failure', '--continue=dependencies-successful', 'continue');
const CONC = item('Concurrency…', '--concurrency, asks for a value', 'concurrency');
const ARGS = item('Extra arguments…', 'after --, passed to every build task in the run', 'passThrough');

const TASK_ROW: TaskNode = { ...TASK_NODE_STUB, kind: 'task' };
const FILE_ROW: TaskNode = { ...TASK_NODE_STUB, kind: 'atom-file' };
const ROOT_ROW: TaskNode = { ...TASK_NODE_STUB, id: '//#build', kind: 'task' };
const LINT_ROW: TaskNode = { ...TASK_NODE_STUB, name: 'lint' };

describe('FEATURE: option items of the Run with Options picker', () => {
  it.each([
    ['task', TASK_ROW],
    ['atom-file', FILE_ROW],
    ['a root //# task', ROOT_ROW]
  ])('GIVEN a %s row THEN the five items in order', (_name, task) => {
    expect(optionItemsOf(task)).toStrictEqual([FORCE, ONLY, KEEP, CONC, ARGS]);
  });

  it.each(['atom-umbrella', 'atom-aggregate'] as const)('GIVEN a %s row THEN three items, no only, no extra args', (kind) => {
    const row: TaskNode = { ...TASK_NODE_STUB, kind };

    expect(optionItemsOf(row)).toStrictEqual([FORCE, KEEP, CONC]);
  });

  it('GIVEN the task lint THEN the last description names lint', () => {
    expect(optionItemsOf(LINT_ROW).at(-1)?.description).toBe('after --, passed to every lint task in the run');
  });
});
