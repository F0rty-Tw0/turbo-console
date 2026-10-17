import { join } from 'node:path';

import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { refusalOf } from './run-refusal.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { isOfferedTask } from '../../tree/utils/task-filter.util.ts';
import type { RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const ROOT = '/ws';

const taskWith = (name: string, overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `p#${name}`, name, ...overrides };

  return task;
};

const MIXED: TaskNode[] = [
  taskWith('build', {}),
  taskWith('no-command-turbo', { command: null }),
  taskWith('lint', { isTurboTask: false }),
  taskWith('a b', { isTurboTask: false }),
  taskWith('-x', { isTurboTask: false }),
  taskWith('empty', { isTurboTask: false, command: null }),
  taskWith('blank', { isTurboTask: false, command: '   ' }),
  taskWith('atom', { kind: 'atom-file' })
];

const PACKAGES: PackageNode[] = [
  { ...PACKAGE_NODE_STUB, name: '//', path: '.', tasks: MIXED },
  { ...PACKAGE_NODE_STUB, name: 'a', path: 'packages/a', tasks: MIXED }
];

const requestFor = (pkg: PackageNode, task: TaskNode): RunRequest => {
  const request: RunRequest = { ...RUN_REQUEST_STUB, root: ROOT, packageName: pkg.name, packageDir: join(ROOT, pkg.path), task };

  return request;
};

describe('FEATURE: an offered task is a runnable task (spec 1c-b §4.1)', () => {
  it.each(PACKAGES)('GIVEN the in-root package $name WHEN scripts are shown THEN no offered task is refused', (pkg) => {
    const offered = pkg.tasks.filter((task) => isOfferedTask(task, true));
    const refusals = offered.map((task) => refusalOf(requestFor(pkg, task)));

    expect(offered.map((task) => task.name)).toStrictEqual(['build', 'no-command-turbo', 'lint']);
    expect(refusals).toStrictEqual([null, null, null]);
  });
});
