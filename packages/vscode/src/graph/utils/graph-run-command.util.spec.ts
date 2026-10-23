import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { runCommandOf } from './graph-run-command.util.ts';
import type { GraphRunRequest } from '../common/graph.type.ts';

const A_BUILD_TASK: GraphTask = {
  id: 'a#build',
  packageName: 'a',
  name: 'build',
  command: 'tsc',
  isRunnable: true,
  dependencies: []
};

const A_BUILD_ROW = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };

type CommandCase = readonly [string, GraphRunRequest, string];

const COMMAND_CASES: CommandCase[] = [
  ['runTask', { type: 'runTask', taskId: 'a#build', noCache: false }, 'turboConsole.runTask'],
  ['runTask with noCache', { type: 'runTask', taskId: 'a#build', noCache: true }, 'turboConsole.runTaskWithoutCache'],
  ['stopTask', { type: 'stopTask', taskId: 'a#build' }, 'turboConsole.stopTask']
];

describe('FEATURE: the tree command of a graph run request', () => {
  describe('GIVEN the task a#build under /ws', () => {
    it.each(COMMAND_CASES)('WHEN it is %s THEN the command is %s', (_label, request, command) => {
      const chosen = runCommandOf(request, A_BUILD_TASK, '/ws');

      expect(chosen.command).toBe(command);
    });

    it.each(COMMAND_CASES)('WHEN it is %s THEN the arg is the task row built from the task and root', (_label, request) => {
      const chosen = runCommandOf(request, A_BUILD_TASK, '/ws');

      expect(chosen.arg).toStrictEqual(A_BUILD_ROW);
    });

    it('WHEN the request names another id THEN the row key is still the task id', () => {
      const request: GraphRunRequest = { type: 'stopTask', taskId: 'other#build' };

      const chosen = runCommandOf(request, A_BUILD_TASK, '/ws');

      expect(chosen.arg).toStrictEqual(A_BUILD_ROW);
    });
  });

  describe('GIVEN the task a#build under /other', () => {
    it('WHEN it is run THEN the row carries /other as its root', () => {
      const request: GraphRunRequest = { type: 'runTask', taskId: 'a#build', noCache: false };

      const chosen = runCommandOf(request, A_BUILD_TASK, '/other');

      expect(chosen.arg).toStrictEqual({ ...A_BUILD_ROW, root: '/other' });
    });
  });
});
