import { TurboException } from '@turbo-console/core';
import type { DryRunState, PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, DryRunPhase, PackageDetails, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import type { RunEntry, RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import type { DetailsInput, DryRunResult } from '../common/details.type.ts';
import {
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB,
  DRY_RUN_STATE_STUB,
  TASK_DEFINITION_STUB,
  TEST_TASK_STUB
} from '../test/stubs/details-model.stub.ts';

const inputWith = (overrides: Partial<DetailsInput>): DetailsInput => {
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, ...overrides };

  return input;
};

const dryRunOf = (phase: DryRunPhase, states: DryRunState[]): DryRunResult => {
  const dryRun: DryRunResult = { phase, states };

  return dryRun;
};

const stateWith = (overrides: Partial<RootState>): RootState => {
  const state: RootState = { ...DETAILS_ROOT_STATE_STUB, ...overrides };

  return state;
};

const packageOf = (state: DetailsState): PackageDetails => {
  if (state.kind !== 'package') throw new Error(`expected a package state, got ${state.kind}`);

  return state;
};

const cardOf = (state: DetailsState, taskId: string): TaskCard => {
  const card = packageOf(state).tasks.find((task) => task.taskId === taskId);

  if (card === undefined) throw new Error(`no card for ${taskId}`);

  return card;
};

const failureOf = (stage: LoadFailure['stage'], error: TurboException): LoadFailure => {
  const failure: LoadFailure = loadFailureOf(stage, error);

  return failure;
};

const modelWith = (packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages };

  return model;
};

const packageNamed = (name: string, tasks: TaskNode[]): PackageNode => {
  const pkg: PackageNode = { name, path: `packages/${name}`, label: null, tags: [], tasks };

  return pkg;
};

describe('FEATURE: package details state', () => {
  describe('GIVEN a package in the model and a dry run that is loading', () => {
    it('WHEN built THEN the package fields come from the model and the phase is loading', () => {
      const input = inputWith({ dryRun: dryRunOf('loading', []) });

      const state = packageOf(toDetailsState(input));

      expect(state).toMatchObject({
        kind: 'package',
        root: '/ws',
        packageName: 'a',
        path: 'packages/a',
        tags: ['lib'],
        dryRun: 'loading',
        reloadError: null
      });
    });

    it('WHEN built THEN every card has no definition and no cache status', () => {
      const input = inputWith({ dryRun: dryRunOf('loading', []) });

      const cards = packageOf(toDetailsState(input)).tasks;

      expect(cards.map((card) => [card.definition, card.cacheStatus])).toStrictEqual([
        [null, null],
        [null, null],
        [null, null]
      ]);
    });
  });

  describe('GIVEN a package whose dry run is ready', () => {
    it('WHEN built THEN a task with a dry-run state shows its definition and cache status', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      expect(cardOf(state, 'a#build')).toMatchObject({ definition: TASK_DEFINITION_STUB, cacheStatus: 'HIT' });
    });

    it('WHEN built THEN a task with no dry-run state keeps null fields', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      expect(cardOf(state, 'a#test')).toMatchObject({ definition: null, cacheStatus: null });
    });

    it('WHEN built THEN the card carries the model name, command and description', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      expect(cardOf(state, 'a#build')).toMatchObject({
        taskId: 'a#build',
        name: 'build',
        command: 'tsc',
        description: 'Compile the package'
      });
    });

    it('WHEN the cache is deferred THEN the card says deferred', () => {
      const deferred: DryRunState = { ...DRY_RUN_STATE_STUB, hash: null, cache: 'deferred' };
      const input = inputWith({ dryRun: dryRunOf('ready', [deferred]) });

      const state = toDetailsState(input);

      expect(cardOf(state, 'a#build').cacheStatus).toBe('deferred');
    });

    it('WHEN the definition holds hostile text THEN it passes through unchanged as data', () => {
      const hostile = { ...TASK_DEFINITION_STUB, inputs: ['<img src=x onerror=alert(1)>'], env: ['$(rm -rf /)'] };
      const hostileState: DryRunState = { ...DRY_RUN_STATE_STUB, definition: hostile };
      const input = inputWith({ dryRun: dryRunOf('ready', [hostileState]) });

      const state = toDetailsState(input);

      expect(cardOf(state, 'a#build').definition).toStrictEqual(hostile);
    });
  });

  describe('GIVEN a dry run that failed', () => {
    it('WHEN built THEN the phase is failed and the model fields stay', () => {
      const input = inputWith({ dryRun: dryRunOf('failed', []) });

      const state = packageOf(toDetailsState(input));

      expect(state).toMatchObject({ dryRun: 'failed', path: 'packages/a' });
      expect(state.tasks).toHaveLength(3);
    });
  });

  describe('GIVEN a package with an umbrella task and an atom-file task', () => {
    it('WHEN built THEN the umbrella card shows no command and the atom-file task has no card', () => {
      const state = packageOf(toDetailsState(DETAILS_INPUT_STUB));

      expect(state.tasks.map((card) => [card.taskId, card.command])).toStrictEqual([
        ['a#build', 'tsc'],
        ['a#check', null],
        ['a#test', 'vitest run']
      ]);
    });
  });

  describe('GIVEN tasks listed out of order', () => {
    it('WHEN built THEN the cards are sorted by name', () => {
      const state = packageOf(toDetailsState(DETAILS_INPUT_STUB));

      expect(state.tasks.map((card) => card.name)).toStrictEqual(['build', 'check', 'test']);
    });
  });

  describe('GIVEN tasks that depend on each other across packages', () => {
    it('WHEN built THEN a card lists the tasks that depend on it, in other packages too', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      expect(cardOf(state, 'a#build').dependents).toStrictEqual(['a#test', 'web#build']);
    });

    it('WHEN nothing depends on a task THEN its dependents are empty', () => {
      const state = toDetailsState(DETAILS_INPUT_STUB);

      expect(cardOf(state, 'a#check').dependents).toStrictEqual([]);
    });
  });

  describe('GIVEN packages `a` and `a#b`, since turbo allows # in a package name', () => {
    const nestedTask: TaskNode = { ...BUILD_TASK_STUB, id: 'a#b#build' };
    const nestedState: DryRunState = { ...DRY_RUN_STATE_STUB, id: 'a#b#build', cache: 'MISS' };
    const model = modelWith([packageNamed('a', [BUILD_TASK_STUB]), packageNamed('a#b', [nestedTask])]);
    const state = stateWith({ model });

    it('WHEN package a is built THEN its card does not take the state of a#b', () => {
      const input = inputWith({ state, dryRun: dryRunOf('ready', [nestedState]) });

      const details = toDetailsState(input);

      expect(cardOf(details, 'a#build')).toMatchObject({ definition: null, cacheStatus: null });
    });

    it('WHEN package a#b is built THEN its card takes its own state', () => {
      const input = inputWith({ state, packageName: 'a#b', dryRun: dryRunOf('ready', [DRY_RUN_STATE_STUB, nestedState]) });

      const details = toDetailsState(input);

      expect(cardOf(details, 'a#b#build')).toMatchObject({ cacheStatus: 'MISS' });
    });
  });

  describe('GIVEN a run of one task', () => {
    it('WHEN built THEN the card run view comes from the lookup for the root and task id', () => {
      const lookedUp: string[] = [];
      const runningTest: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'a#test', state: 'running' };
      const entries = new Map([['a#test', runningTest]]);
      const runs: RunLookup = (root, taskId) => {
        lookedUp.push(`${root}|${taskId}`);

        return entries.get(taskId);
      };

      const state = toDetailsState(inputWith({ runs }));

      expect(cardOf(state, 'a#test').run).toStrictEqual({
        iconId: 'sync',
        colorVar: null,
        text: 'running',
        isRunning: true,
        elapsedMs: 0,
        isSpinning: true,
        isIdle: false
      });
      expect(cardOf(state, 'a#build').run).toStrictEqual({
        iconId: 'tools',
        colorVar: null,
        text: '',
        isRunning: false,
        elapsedMs: null,
        isSpinning: false,
        isIdle: true
      });
      expect(lookedUp).toContain('/ws|a#test');
    });
  });

  describe('GIVEN a failed reload', () => {
    it('WHEN the binary stage failed THEN reloadError is the fixed binary text', () => {
      const error = failureOf('binary', new TurboException('not-found', 'ENOENT /home/secret/turbo'));
      const input = inputWith({ state: stateWith({ error }) });

      const details = packageOf(toDetailsState(input));

      expect(details.reloadError).toBe(MESSAGE_TEXTS['binary-not-found']);
      expect(JSON.stringify(details)).not.toContain('secret');
    });

    it('WHEN the binary version is unsupported THEN reloadError is the version text', () => {
      const error = failureOf('binary', new TurboException('version-unsupported', 'turbo 1.0.0'));
      const input = inputWith({ state: stateWith({ error }) });

      const details = packageOf(toDetailsState(input));

      expect(details.reloadError).toBe(MESSAGE_TEXTS['binary-version']);
    });

    it('WHEN the load stage failed with a model kept THEN reloadError is the load text, not the message', () => {
      const error = failureOf('load', new TurboException('failed', 'stderr: HOSTILE-STDERR'));
      const input = inputWith({ state: stateWith({ error }) });

      const details = packageOf(toDetailsState(input));

      expect(details.reloadError).toBe(MESSAGE_TEXTS['load-with-model']);
      expect(JSON.stringify(details)).not.toContain('HOSTILE');
    });

    it('WHEN the reload did not fail THEN reloadError is null', () => {
      const details = packageOf(toDetailsState(DETAILS_INPUT_STUB));

      expect(details.reloadError).toBeNull();
    });
  });

  describe('GIVEN a package that is not in the model', () => {
    it('WHEN built THEN the state is missing with the root and package name', () => {
      const input = inputWith({ packageName: 'gone' });

      const state = toDetailsState(input);

      expect(state).toStrictEqual({ kind: 'missing', root: '/ws', packageName: 'gone' });
    });

    it('WHEN the root has no model THEN the state is missing', () => {
      const input = inputWith({ state: stateWith({ model: null }) });

      const state = toDetailsState(input);

      expect(state).toStrictEqual({ kind: 'missing', root: '/ws', packageName: 'a' });
    });
  });

  describe('GIVEN a package with only atom-file tasks', () => {
    it('WHEN built THEN it has no cards', () => {
      const fileTask: TaskNode = { ...TEST_TASK_STUB, kind: 'atom-file' };
      const fileOnly: PackageNode = { ...A_PACKAGE_STUB, tasks: [fileTask] };
      const input = inputWith({ state: stateWith({ model: modelWith([fileOnly]) }) });

      const state = packageOf(toDetailsState(input));

      expect(state.tasks).toStrictEqual([]);
    });
  });
});
