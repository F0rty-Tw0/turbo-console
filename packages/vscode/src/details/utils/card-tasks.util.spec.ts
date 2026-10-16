import type { TaskNode } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { cardTasksOf } from './card-tasks.util.ts';
import type { RunLookup } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  FILE_TASK_STUB,
  TEST_TASK_STUB
} from '../test/stubs/details-model.stub.ts';

const PACKAGE = { ...A_PACKAGE_STUB, tasks: [TEST_TASK_STUB, ADHOC_TASK_STUB, FILE_TASK_STUB, BUILD_TASK_STUB] };
const RUNNING_ADHOC = { ...RUN_ENTRY_STUB, taskId: 'a#adhoc', task: ADHOC_TASK_STUB };

const namesOf = (tasks: TaskNode[]): string[] => tasks.map((task) => task.name);

const runningAdhoc: RunLookup = () => RUNNING_ADHOC;

describe('FEATURE: the tasks that get a card', () => {
  it('GIVEN scripts shown WHEN chosen THEN every visible task is in name order and nothing is hidden', () => {
    const { shown, hiddenScriptCount } = cardTasksOf(PACKAGE, DETAILS_INPUT_STUB);

    expect(namesOf(shown)).toStrictEqual(['adhoc', 'build', 'test']);
    expect(hiddenScriptCount).toBe(0);
  });

  it('GIVEN scripts hidden WHEN chosen THEN the script is left out and counted', () => {
    const { shown, hiddenScriptCount } = cardTasksOf(PACKAGE, { ...DETAILS_INPUT_STUB, scriptsShown: false });

    expect(namesOf(shown)).toStrictEqual(['build', 'test']);
    expect(hiddenScriptCount).toBe(1);
  });

  it('GIVEN scripts hidden and the script running WHEN chosen THEN it keeps its card and is not counted', () => {
    const input = { ...DETAILS_INPUT_STUB, scriptsShown: false, runs: runningAdhoc };

    const { shown, hiddenScriptCount } = cardTasksOf(PACKAGE, input);

    expect(namesOf(shown)).toStrictEqual(['adhoc', 'build', 'test']);
    expect(hiddenScriptCount).toBe(0);
  });
});
