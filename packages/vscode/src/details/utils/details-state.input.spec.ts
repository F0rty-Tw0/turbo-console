import type { DetailsState, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { detailsInputOf, toDetailsState } from './details-state.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { DetailsInput } from '../common/details.type.ts';
import { BUILD_TASK_STUB, DETAILS_INPUT_STUB } from '../test/stubs/details-model.stub.ts';

const NOW = 1_000_000;

const RUNNING_BUILD: RunEntry = {
  ...RUN_ENTRY_STUB,
  task: BUILD_TASK_STUB,
  taskId: 'a#build',
  state: 'running',
  launchedAt: NOW - 12_345
};

const cardOf = (state: DetailsState, taskId: string): TaskCard | undefined => {
  if (state.kind !== 'package') return undefined;

  return state.tasks.find((card) => card.taskId === taskId);
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

      expect(cardOf(state, 'a#build')?.run.text).toBe('running · 12s');
    });
  });
});
