import type { PackageManagerName, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { hiddenScriptsText } from '@turbo-console/webview-ui';
import type { DetailsState, PackageDetails, TaskCard } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toDetailsState } from './details-state.util.ts';
import type { RunEntry, RunLookup, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { emptyTasksText } from '../../run/utils/picker-text.util.ts';
import { PACKAGE_MANAGER_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { DetailsInput } from '../common/details.type.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_INPUT_STUB,
  DETAILS_MODEL_STUB,
  DETAILS_ROOT_STATE_STUB
} from '../test/stubs/details-model.stub.ts';

const LINT_SCRIPT: TaskNode = { ...ADHOC_TASK_STUB, id: 'a#lint', name: 'lint', command: 'eslint .' };
const REFUSED_SCRIPT: TaskNode = { ...ADHOC_TASK_STUB, id: 'a#bad name', name: 'bad name', command: 'echo bad' };
const MIXED_PACKAGE = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB, LINT_SCRIPT, REFUSED_SCRIPT] };
const SCRIPTS_ONLY_PACKAGE = { ...A_PACKAGE_STUB, tasks: [ADHOC_TASK_STUB, LINT_SCRIPT, REFUSED_SCRIPT] };

const modelWith = (pkg: typeof MIXED_PACKAGE, manager: PackageManagerName = 'pnpm'): WorkspaceModel => {
  const packageManager = { ...PACKAGE_MANAGER_STUB, name: manager };
  const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packageManager, packages: [pkg] };

  return model;
};

const inputOf = (model: WorkspaceModel, scriptsShown: boolean, runs: RunLookup = () => undefined): DetailsInput => {
  const state = { ...DETAILS_ROOT_STATE_STUB, model };
  const input: DetailsInput = { ...DETAILS_INPUT_STUB, state, scriptsShown, runs };

  return input;
};

const entryOf = (task: TaskNode, state: RunState): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, taskId: task.id, task, state };

  return entry;
};

const runsOf = (entry: RunEntry): RunLookup => {
  const lookup: RunLookup = (root, taskId) => (root === entry.root && taskId === entry.taskId ? entry : undefined);

  return lookup;
};

const packageOf = (state: DetailsState): PackageDetails => {
  if (state.kind !== 'package') throw new Error(`expected a package state, got ${state.kind}`);

  return state;
};

const idsOf = (details: PackageDetails): string[] => details.tasks.map((card) => card.taskId);

const cardOf = (details: PackageDetails, taskId: string): TaskCard => {
  const card = details.tasks.find((candidate) => candidate.taskId === taskId);

  if (card === undefined) throw new Error(`no card for ${taskId}`);

  return card;
};

describe('FEATURE: package details with scripts', () => {
  describe('GIVEN scripts shown', () => {
    const details = packageOf(toDetailsState(inputOf(modelWith(MIXED_PACKAGE), true)));

    it('WHEN built THEN every visible script has a card, refused ones included, and none is counted hidden', () => {
      expect(idsOf(details)).toStrictEqual(['a#adhoc', 'a#bad name', 'a#build', 'a#lint']);
      expect(details.scriptsShown).toBe(true);
      expect(details.hiddenScriptCount).toBe(0);
    });

    it('WHEN built THEN a script card runs "<manager> run <name>" and a turbo card has no run command', () => {
      expect(cardOf(details, 'a#lint').runCommand).toBe('pnpm run lint');
      expect(cardOf(details, 'a#build').runCommand).toBeNull();
    });

    it('WHEN built THEN a script whose name is refused has no run command', () => {
      expect(cardOf(details, 'a#bad name').runCommand).toBeNull();
    });

    it('WHEN built THEN a script with a blank body has no run command, as Run and Copy refuse it', () => {
      const blank: TaskNode = { ...LINT_SCRIPT, id: 'a#blank', name: 'blank', command: ' ' };
      const blankDetails = packageOf(toDetailsState(inputOf(modelWith({ ...A_PACKAGE_STUB, tasks: [blank] }), true)));

      expect(cardOf(blankDetails, 'a#blank').runCommand).toBeNull();
    });

    it('WHEN built THEN a script with no command at all has no run command either', () => {
      const none: TaskNode = { ...LINT_SCRIPT, id: 'a#none', name: 'none', command: null };
      const noneDetails = packageOf(toDetailsState(inputOf(modelWith({ ...A_PACKAGE_STUB, tasks: [none] }), true)));

      expect(cardOf(noneDetails, 'a#none').runCommand).toBeNull();
    });

    it('WHEN a script body holds a bidi override and a line break THEN the card command drops the override and keeps the break', () => {
      const hostile: TaskNode = { ...LINT_SCRIPT, command: 'eslint‮ .\n--fix' };
      const hostileDetails = packageOf(toDetailsState(inputOf(modelWith({ ...A_PACKAGE_STUB, tasks: [hostile] }), true)));

      expect(cardOf(hostileDetails, 'a#lint').command).toBe('eslint .\n--fix');
    });

    it('WHEN a script body is control characters only THEN the card command is null, so its field reads none', () => {
      const controls: TaskNode = { ...LINT_SCRIPT, command: '‮\u0007' };
      const controlsDetails = packageOf(toDetailsState(inputOf(modelWith({ ...A_PACKAGE_STUB, tasks: [controls] }), true)));

      expect(cardOf(controlsDetails, 'a#lint').command).toBeNull();
    });

    it('WHEN the root uses another package manager THEN the run command names it', () => {
      const yarn = packageOf(toDetailsState(inputOf(modelWith(MIXED_PACKAGE, 'yarn'), true)));

      expect(cardOf(yarn, 'a#lint').runCommand).toBe('yarn run lint');
    });
  });

  describe('GIVEN scripts hidden', () => {
    const details = packageOf(toDetailsState(inputOf(modelWith(MIXED_PACKAGE), false)));

    it('WHEN built THEN only turbo cards stay and the toggle value is copied', () => {
      expect(idsOf(details)).toStrictEqual(['a#build']);
      expect(details.scriptsShown).toBe(false);
    });

    it('WHEN built THEN the hidden count is the offered scripts, the refused name left out', () => {
      expect(details.hiddenScriptCount).toBe(2);
    });

    it('WHEN a package has scripts only THEN its count equals the number the pickers say', () => {
      const scriptsOnly = packageOf(toDetailsState(inputOf(modelWith(SCRIPTS_ONLY_PACKAGE), false)));

      expect(scriptsOnly.tasks).toStrictEqual([]);
      expect(emptyTasksText(SCRIPTS_ONLY_PACKAGE, false)).toBe(hiddenScriptsText(scriptsOnly.hiddenScriptCount));
    });
  });

  describe('GIVEN scripts hidden and a script with a live run', () => {
    const running = runsOf(entryOf(LINT_SCRIPT, 'running'));
    const details = packageOf(toDetailsState(inputOf(modelWith(MIXED_PACKAGE), false, running)));

    it('WHEN built THEN the running script keeps its card with its run command and is not counted hidden', () => {
      expect(idsOf(details)).toStrictEqual(['a#build', 'a#lint']);
      expect(cardOf(details, 'a#lint').runCommand).toBe('pnpm run lint');
      expect(details.hiddenScriptCount).toBe(1);
    });

    it('WHEN the run has ended THEN the card goes and the script is counted hidden', () => {
      const ended = runsOf(entryOf(LINT_SCRIPT, 'passed'));
      const after = packageOf(toDetailsState(inputOf(modelWith(MIXED_PACKAGE), false, ended)));

      expect(idsOf(after)).toStrictEqual(['a#build']);
      expect(after.hiddenScriptCount).toBe(2);
    });
  });
});
