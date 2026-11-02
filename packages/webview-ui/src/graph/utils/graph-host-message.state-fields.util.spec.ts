import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { stateMessageOf } from '../test/utils/graph-host-message.spec.util.ts';

const PACKAGE = { name: 'app', path: 'apps/app', tags: ['ui'], taskCount: 3 };

const TASK = {
  id: 'app#build',
  packageName: 'app',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  isTurboTask: true,
  dependencies: []
};

const GRAPH = {
  kind: 'graph',
  hash: 'h',
  packages: [PACKAGE],
  edges: [],
  positions: null,
  folderPositions: null,
  tasks: [],
  atomGroups: [],
  singlePackage: false,
  rootLabel: null
};

const graphWithTaskOf = (change: object): unknown => {
  const task = { ...TASK, ...change };
  const tasks = [task];

  return stateMessageOf({ ...GRAPH, tasks });
};

describe('FEATURE: graph host message, new state fields', () => {
  it('GIVEN a state message with a script task WHEN checked THEN it is accepted', () => {
    expect(isGraphHostMessage(graphWithTaskOf({ isTurboTask: false }))).toBe(true);
  });

  it.each([
    ['a task with no isTurboTask', graphWithTaskOf({ isTurboTask: undefined })],
    ['a task with a numeric isTurboTask', graphWithTaskOf({ isTurboTask: 1 })]
  ])('GIVEN a state message with %s WHEN checked THEN it is rejected', (_label, message) => {
    expect(isGraphHostMessage(message)).toBe(false);
  });
});
