import { describe, expect, it } from 'vitest';

import { isGraphHostMessage } from './graph-host-message.util.ts';
import { stateMessageOf, without } from '../test/utils/graph-host-message.spec.util.ts';

const PACKAGE = { name: 'app', bareName: 'app', path: 'apps/app', tags: ['ui'], taskCount: 3 };

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
  rootLabel: null,
  scopeShown: true,
  scriptsShown: true
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

describe('FEATURE: graph host message, package bareName', () => {
  it.each([
    ['a package with no bareName', [{ ...PACKAGE, bareName: undefined }]],
    ['a package with a numeric bareName', [{ ...PACKAGE, bareName: 5 }]]
  ])('GIVEN a state message with %s WHEN checked THEN it is rejected', (_label, packages) => {
    expect(isGraphHostMessage(stateMessageOf({ ...GRAPH, packages }))).toBe(false);
  });
});

describe('FEATURE: graph host message, shown toggles', () => {
  it.each([
    ['scopeShown missing', without(GRAPH, 'scopeShown')],
    ['scriptsShown missing', without(GRAPH, 'scriptsShown')],
    ['scopeShown a string', { ...GRAPH, scopeShown: 'yes' }],
    ['scriptsShown a number', { ...GRAPH, scriptsShown: 1 }]
  ])('GIVEN a state with %s WHEN checked THEN it is rejected', (_label, state) => {
    expect(isGraphHostMessage(stateMessageOf(state))).toBe(false);
  });

  it('GIVEN both flags false WHEN checked THEN it is accepted', () => {
    expect(isGraphHostMessage(stateMessageOf({ ...GRAPH, scopeShown: false, scriptsShown: false }))).toBe(true);
  });

  it('GIVEN both flags true WHEN checked THEN it is accepted', () => {
    expect(isGraphHostMessage(stateMessageOf({ ...GRAPH, scopeShown: true, scriptsShown: true }))).toBe(true);
  });
});
