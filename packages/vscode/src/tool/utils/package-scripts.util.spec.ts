import type { PackageNode, TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { packageScriptsOf, toolTitleOf } from './package-scripts.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { TOOLS } from '../common/tool.const.ts';
import type { ToolMatch } from '../common/tool.type.ts';

const taskOf = (name: string, command: string | null): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id: `a#${name}`, name, command };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { ...PACKAGE_NODE_STUB, name, tasks };

  return pkg;
};

const VITEST = TOOLS.find((tool) => tool.id === 'vitest');

const matchOf = (via: string[]): ToolMatch => {
  if (VITEST === undefined) throw new Error('vitest row missing');

  const match: ToolMatch = { tool: VITEST, via };

  return match;
};

describe('FEATURE: package scripts', () => {
  it('GIVEN tasks with and without a command WHEN the scripts are built THEN only commands are kept by name', () => {
    const pkg = packageOf('web', [taskOf('lint', 'eslint .'), taskOf('plain', null), taskOf('test', 'vitest')]);

    const scripts = packageScriptsOf(pkg, false);

    expect(Array.from(scripts.bodies)).toStrictEqual([
      ['lint', 'eslint .'],
      ['test', 'vitest']
    ]);
  });

  it.each<[string, boolean, boolean]>([
    ['//', false, false],
    ['//', true, true],
    ['web', false, true],
    ['web', true, true]
  ])('GIVEN package %j and singlePackage %s WHEN the scripts are built THEN followTurbo is %s', (name, singlePackage, expected) => {
    const pkg = packageOf(name, []);

    const scripts = packageScriptsOf(pkg, singlePackage);

    expect(scripts.followTurbo).toBe(expected);
  });
});

describe('FEATURE: tool title', () => {
  it.each<[string[], string]>([
    [[], 'Vitest'],
    [['test:app'], 'Vitest (via test:app)'],
    [['a', 'b'], 'Vitest (via a → b)']
  ])('GIVEN the via %j WHEN the title is built THEN it is %s', (via, expected) => {
    const title = toolTitleOf(matchOf(via));

    expect(title).toBe(expected);
  });
});
