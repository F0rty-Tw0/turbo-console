import type { PackageNode, RunMatch, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { RunView } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { liveRunViewOf, toRunView } from './run-view.util.ts';
import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { IDLE_ICON, RUNNING_ICON } from '../../tree/common/icon.const.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { A_PACKAGE_STUB, BUILD_TASK_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

/** The patterns the webview enforces before it uses either field (webview-ui `run-view.const.ts`). */
const ICON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_VAR_PATTERN = /^--vscode-[A-Za-z0-9-]+$/;

const NOW = 1_000_000;

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };

const CONTINUOUS: TaskNode = { ...TASK_NODE_STUB, persistent: true };
const NOT_TURBO: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };
const KINDS: TaskNode[] = [TASK_NODE_STUB, CONTINUOUS, NOT_TURBO];

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const ALL_STATES: RunState[] = ['running', 'passed', 'failed', 'stopped', 'failed-to-start'];

const viewsOfKind = (task: TaskNode): RunView[] => {
  const entries = ALL_STATES.map((state) => entryIn({ state, exitCode: 0, match: HIT_MATCH }));
  const views = entries.map((entry) => toRunView(task, entry, NOW));

  return [toRunView(task, undefined, NOW), ...views];
};

const viewsOfAllStates = (): RunView[] => KINDS.flatMap(viewsOfKind);

const RUNNING_BUILD: RunEntry = entryIn({ task: BUILD_TASK_STUB, taskId: 'a#build', state: 'running', launchedAt: NOW - 12_345 });

const CONTINUOUS_BUILD: TaskNode = { ...BUILD_TASK_STUB, persistent: true };

const modelWith = (tasks: TaskNode[]): WorkspaceModel => {
  const pkg: PackageNode = { ...A_PACKAGE_STUB, tasks };
  const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [pkg] };

  return model;
};

describe('FEATURE: run view of a task', () => {
  describe('GIVEN a task that never ran', () => {
    it('WHEN viewed THEN it shows the idle icon, no color, no text and is not running', () => {
      const view = toRunView(TASK_NODE_STUB, undefined, NOW);

      expect(view).toStrictEqual({ iconId: 'tools', colorVar: null, text: '', isRunning: false });
    });
  });

  describe('GIVEN a running task', () => {
    it('WHEN viewed THEN the icon is the tree running icon without its spin modifier and isRunning is set', () => {
      const view = toRunView(TASK_NODE_STUB, entryIn({ state: 'running', launchedAt: NOW - 12_345 }), NOW);

      expect(view).toStrictEqual({
        iconId: RUNNING_ICON.id.replace('~spin', ''),
        colorVar: null,
        text: 'running · 12s',
        isRunning: true
      });
    });
  });

  describe('GIVEN a passed task whose summary matched a cache hit', () => {
    it('WHEN viewed THEN the text is the duration and cached and the color is the passed theme variable', () => {
      const view = toRunView(TASK_NODE_STUB, entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH }), NOW);

      expect(view).toStrictEqual({ iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: '3.2s · cached', isRunning: false });
    });
  });

  describe('GIVEN a stopped task', () => {
    it('WHEN viewed THEN a theme id without a dot becomes its variable unchanged', () => {
      const view = toRunView(TASK_NODE_STUB, entryIn({ state: 'stopped' }), NOW);

      expect(view.colorVar).toBe('--vscode-disabledForeground');
    });
  });

  describe('GIVEN a failed task', () => {
    it('WHEN viewed THEN the failed theme variable is used and isRunning is false', () => {
      const view = toRunView(TASK_NODE_STUB, entryIn({ state: 'failed', exitCode: 1 }), NOW);

      expect(view).toStrictEqual({ iconId: 'error', colorVar: '--vscode-testing-iconFailed', text: 'exit 1', isRunning: false });
    });
  });

  describe('GIVEN every state and kind the tree can show', () => {
    it('WHEN viewed THEN each iconId matches the pattern the webview enforces', () => {
      const iconIds = viewsOfAllStates().map((view) => view.iconId);

      expect(iconIds.every((iconId) => ICON_ID_PATTERN.test(iconId))).toBe(true);
    });

    it('WHEN viewed THEN each colorVar is null or matches the pattern the webview enforces', () => {
      const colorVars = viewsOfAllStates().map((view) => view.colorVar);
      const isAllowed = (colorVar: string | null): boolean => colorVar === null || COLOR_VAR_PATTERN.test(colorVar);

      expect(colorVars.every(isAllowed)).toBe(true);
    });

    it('WHEN viewed THEN the idle icon is the tree idle icon', () => {
      const view = toRunView(TASK_NODE_STUB, undefined, NOW);

      expect(view.iconId).toBe(IDLE_ICON.id);
    });
  });
});

describe('FEATURE: live run view of a run that changed', () => {
  describe('GIVEN a running build whose config turned it continuous mid-run', () => {
    it('WHEN the model holds the task THEN the view reads the current node', () => {
      const view = liveRunViewOf(modelWith([CONTINUOUS_BUILD]), RUNNING_BUILD, NOW);

      expect([view.iconId, view.text]).toStrictEqual(['pulse', 'continuous · 12s']);
    });

    it('WHEN the root has no model THEN the view reads the task the run was launched with', () => {
      const view = liveRunViewOf(null, RUNNING_BUILD, NOW);

      expect([view.iconId, view.text]).toStrictEqual(['sync', 'running · 12s']);
    });

    it('WHEN the package no longer has the task THEN the view reads the task the run was launched with', () => {
      const view = liveRunViewOf(modelWith([]), RUNNING_BUILD, NOW);

      expect([view.iconId, view.text]).toStrictEqual(['sync', 'running · 12s']);
    });

    it('WHEN the model no longer has the package THEN the view reads the task the run was launched with', () => {
      const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [] };

      const view = liveRunViewOf(model, RUNNING_BUILD, NOW);

      expect([view.iconId, view.text]).toStrictEqual(['sync', 'running · 12s']);
    });
  });
});
