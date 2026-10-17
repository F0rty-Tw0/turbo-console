import type { TaskNode } from '@turbo-console/core';
import type { DetailsState, PackageDetails, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { RunEntry, RunLookup, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { DetailsInput } from '../common/details.type.ts';
import {
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const TASK_ID = 'a#build';

const taskWith = (overrides: Partial<TaskNode>): TaskNode => {
  const task: TaskNode = { ...BUILD_TASK_STUB, id: TASK_ID, name: 'build', ...overrides };

  return task;
};

const inputOf = (task: TaskNode, runs: RunLookup = () => undefined): DetailsInput => {
  const pkg = { ...A_PACKAGE_STUB, tasks: [task] };
  const model = { ...DETAILS_MODEL_STUB, packages: [pkg] };
  const state = { ...DETAILS_ROOT_STATE_STUB, model };
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, state, scriptsShown: true, runs };

  return input;
};

const packageOf = (state: DetailsState): PackageDetails => {
  if (state.kind !== 'package') throw new Error(`expected a package state, got ${state.kind}`);

  return state;
};

const cardOf = (task: TaskNode, runs?: RunLookup): TaskCard => {
  const details = packageOf(toDetailsState(inputOf(task, runs)));
  const card = details.tasks.find((candidate) => candidate.taskId === task.id);

  if (card === undefined) throw new Error(`no card for ${task.id}`);

  return card;
};

const runsIn = (task: TaskNode, state: RunState): RunLookup => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: task.id, task, state };
  const lookup: RunLookup = (root, taskId) => (root === entry.root && taskId === entry.taskId ? entry : undefined);

  return lookup;
};

describe('FEATURE: the tool of a task card', () => {
  describe('GIVEN a turbo task', () => {
    it('WHEN its command runs a tool with a glyph THEN the card names it and carries the glyph icon id', () => {
      const card = cardOf(taskWith({ command: 'vitest run' }));

      expect(card.tool).toStrictEqual({ title: 'Vitest', iconId: 'turbo-console-vitest' });
    });

    it('WHEN its tool has no glyph THEN the card names it with a null icon id', () => {
      const card = cardOf(taskWith({ command: 'playwright test' }));

      expect(card.tool).toStrictEqual({ title: 'Playwright', iconId: null });
    });

    it('WHEN its command runs no known tool THEN the tool is null', () => {
      const card = cardOf(taskWith({ command: 'node x.js' }));

      expect(card.tool).toBeNull();
    });

    it('WHEN it has no command THEN the tool is null', () => {
      const card = cardOf(taskWith({ command: null }));

      expect(card.tool).toBeNull();
    });
  });

  describe('GIVEN a package script', () => {
    it('WHEN its body runs eslint THEN the card names ESLint', () => {
      const card = cardOf(taskWith({ isTurboTask: false, name: 'lint', id: TASK_ID, command: 'eslint .' }));

      expect(card.tool).toStrictEqual({ title: 'ESLint', iconId: 'turbo-console-eslint' });
    });
  });

  describe('GIVEN a vitest task with a run entry', () => {
    it.each(['running', 'passed', 'failed'] as const)('WHEN the run is %s THEN the card keeps the same tool', (state) => {
      const task = taskWith({ command: 'vitest run' });

      const card = cardOf(task, runsIn(task, state));

      expect(card.tool).toStrictEqual({ title: 'Vitest', iconId: 'turbo-console-vitest' });
    });
  });
});
