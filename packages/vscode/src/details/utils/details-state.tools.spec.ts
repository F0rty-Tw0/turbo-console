import type { PackageNode, TaskNode } from '@turbo-console/core';
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

const ROOT_PACKAGE_NAME = '//';

const chainPackageOf = (name: string): PackageNode => {
  const wrapper = taskWith({ id: `${name}#test`, name: 'test', command: 'npm run test:app' });
  const inner = taskWith({ id: `${name}#test:app`, name: 'test:app', command: 'vitest' });
  const turbo = taskWith({ id: `${name}#ci`, name: 'ci', command: 'turbo run test' });
  const pkg: PackageNode = { ...A_PACKAGE_STUB, name, tasks: [wrapper, inner, turbo] };

  return pkg;
};

const chainCardsOf = (pkg: PackageNode, singlePackage: boolean): Map<string, TaskCard> => {
  const model = { ...DETAILS_MODEL_STUB, packages: [pkg], singlePackage };
  const state = { ...DETAILS_ROOT_STATE_STUB, model };
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, state, packageName: pkg.name, scriptsShown: true };
  const cards = packageOf(toDetailsState(input)).tasks.map((card): [string, TaskCard] => [card.name, card]);

  return new Map(cards);
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

    it('WHEN its command runs node THEN the card names Node.js with its glyph icon id', () => {
      const card = cardOf(taskWith({ command: 'node --import tsx src/main.ts' }));

      expect(card.tool).toStrictEqual({ title: 'Node.js', iconId: 'turbo-console-node' });
    });

    it('WHEN its tool has no glyph THEN the card names it with a null icon id', () => {
      const card = cardOf(taskWith({ command: 'playwright test' }));

      expect(card.tool).toStrictEqual({ title: 'Playwright', iconId: null });
    });

    it('WHEN its command runs no known tool THEN the tool is null', () => {
      const card = cardOf(taskWith({ command: 'make x' }));

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

  describe('GIVEN a script that delegates to another script of its package', () => {
    it('WHEN test runs npm run test:app and test:app runs vitest THEN the card is titled with its via', () => {
      const cards = chainCardsOf(chainPackageOf('a'), false);

      expect(cards.get('test')?.tool).toStrictEqual({ title: 'Vitest (via test:app)', iconId: 'turbo-console-vitest' });
    });

    it('WHEN a monorepo root // runs turbo run test THEN its tool is null', () => {
      const cards = chainCardsOf(chainPackageOf(ROOT_PACKAGE_NAME), false);

      expect(cards.get('ci')?.tool).toBeNull();
    });

    it('WHEN a single-package // runs turbo run test THEN it follows test to Vitest via test → test:app', () => {
      const cards = chainCardsOf(chainPackageOf(ROOT_PACKAGE_NAME), true);

      expect(cards.get('ci')?.tool?.title).toBe('Vitest (via test → test:app)');
    });
  });
});
