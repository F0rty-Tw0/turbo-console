import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { emptyTasksText, hiddenScriptsText } from './picker-text.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { NO_PACKAGE_TASKS_TEXT } from '../common/picker.const.ts';

const scriptNamed = (name: string): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `p#${name}`, name, isTurboTask: false };

  return task;
};

const packageOf = (tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, tasks };

  return pkg;
};

describe('FEATURE: hidden scripts text', () => {
  it('WHEN the count is 2 THEN the hint names it', () => {
    expect(hiddenScriptsText(2)).toBe('No turbo tasks in this package. Show scripts to see 2.');
  });
});

describe('FEATURE: text of a package with no task to pick', () => {
  const scripts = [scriptNamed('lint'), scriptNamed('fmt'), scriptNamed('a b')];

  it('GIVEN scripts are hidden and 2 are offered, 1 refused WHEN asked THEN the hint counts 2', () => {
    expect(emptyTasksText(packageOf(scripts), false)).toBe(hiddenScriptsText(2));
  });

  it('GIVEN scripts are hidden and every script is refused WHEN asked THEN the plain text shows', () => {
    expect(emptyTasksText(packageOf([scriptNamed('a b')]), false)).toBe(NO_PACKAGE_TASKS_TEXT);
  });

  it('GIVEN scripts are hidden and the package has no script WHEN asked THEN the plain text shows', () => {
    expect(emptyTasksText(packageOf([]), false)).toBe(NO_PACKAGE_TASKS_TEXT);
  });

  it('GIVEN scripts are shown WHEN asked THEN the plain text shows, whatever the scripts', () => {
    expect(emptyTasksText(packageOf(scripts), true)).toBe(NO_PACKAGE_TASKS_TEXT);
  });
});
