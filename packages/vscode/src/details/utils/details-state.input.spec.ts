import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { detailsInputOf, toDetailsState } from './details-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { DetailsInput } from '../common/details.type.ts';
import {
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const NOW = 1_000_000;

const RUNNING_BUILD: RunEntry = {
  ...RUN_ENTRY_STUB,
  task: BUILD_TASK_STUB,
  taskId: 'a#build',
  state: 'running',
  launchedAt: NOW - 12_345
};

const CONTINUOUS_BUILD: TaskNode = { ...BUILD_TASK_STUB, persistent: true };

const ONE_SHOT_BUILD: TaskNode = { ...BUILD_TASK_STUB, persistent: false };

const cardOf = (state: DetailsState, taskId: string): TaskCard => {
  if (state.kind !== 'package') throw new Error(`expected a package state, got ${state.kind}`);

  const card = state.tasks.find((task) => task.taskId === taskId);

  if (card === undefined) throw new Error(`no card for ${taskId}`);

  return card;
};

/** The details input of a root whose one package holds `build` as given, with `runs` answering every lookup. */
const inputHolding = (build: TaskNode, run: RunEntry | undefined): DetailsInput => {
  const pkg: PackageNode = { ...A_PACKAGE_STUB, tasks: [build] };
  const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [pkg] };
  const state: RootState = { ...DETAILS_ROOT_STATE_STUB, model };
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, state, runs: () => run, now: NOW };

  return input;
};

describe('FEATURE: details input clock', () => {
  describe('GIVEN the parts of a details input', () => {
    it('WHEN the input is built THEN it carries the clock reading it is given', () => {
      const base: Omit<DetailsInput, 'now'> = DETAILS_INPUT_STUB;

      const input = detailsInputOf(base, NOW);

      expect(input).toStrictEqual({ ...DETAILS_INPUT_STUB, now: NOW });
    });
  });

  describe('GIVEN an input whose build task is running', () => {
    it('WHEN the state is built THEN the card counts its run from the input clock', () => {
      const input: DetailsInput = { ...DETAILS_INPUT_STUB, runs: () => RUNNING_BUILD, now: NOW };

      const state = toDetailsState(input);

      expect(cardOf(state, 'a#build').run.elapsedMs).toBe(12_345);
    });

    it('WHEN a config edit made the build continuous and the state is rebuilt THEN the card reads the new kind', () => {
      const state = toDetailsState(inputHolding(CONTINUOUS_BUILD, RUNNING_BUILD));

      const card = cardOf(state, 'a#build');

      expect([card.persistent, card.run.iconId, card.run.text]).toStrictEqual([true, 'pulse', 'continuous']);
    });
  });
});

describe('FEATURE: task card kind', () => {
  describe.each([
    ['a continuous', CONTINUOUS_BUILD, true],
    ['a one-shot', ONE_SHOT_BUILD, false]
  ])('GIVEN %s build task in the model', (_label, build, isPersistent) => {
    it('WHEN the state is built THEN the card copies persistent from the model node', () => {
      const state = toDetailsState(inputHolding(build, undefined));

      const card = cardOf(state, 'a#build');

      expect(card.persistent).toBe(isPersistent);
    });
  });
});
