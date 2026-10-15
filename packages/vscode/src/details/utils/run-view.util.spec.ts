import type { RunMatch } from '@turbo-console/core';
import type { RunView } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { toRunView } from './run-view.util.ts';
import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { IDLE_ICON, RUNNING_ICON } from '../../tree/common/icon.const.ts';

/** The patterns the webview enforces before it uses either field (webview-ui `run-view.const.ts`). */
const ICON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COLOR_VAR_PATTERN = /^--vscode-[A-Za-z0-9-]+$/;

const HIT_MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };

const entryIn = (overrides: Partial<RunEntry>): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, ...overrides };

  return entry;
};

const ALL_STATES: RunState[] = ['running', 'passed', 'failed', 'stopped', 'failed-to-start'];

const viewsOfAllStates = (): RunView[] => {
  const entries = ALL_STATES.map((state) => entryIn({ state, exitCode: 0, match: HIT_MATCH }));
  const views = entries.map((entry) => toRunView(entry));

  return [toRunView(undefined), ...views];
};

describe('FEATURE: run view of a task', () => {
  describe('GIVEN a task that never ran', () => {
    it('WHEN viewed THEN it shows the idle icon, no color, no text and is not running', () => {
      const view = toRunView(undefined);

      expect(view).toStrictEqual({ iconId: 'tools', colorVar: null, text: '', isRunning: false });
    });
  });

  describe('GIVEN a running task', () => {
    it('WHEN viewed THEN the icon is the tree running icon without its spin modifier and isRunning is set', () => {
      const view = toRunView(entryIn({ state: 'running' }));

      expect(view).toStrictEqual({
        iconId: RUNNING_ICON.id.replace('~spin', ''),
        colorVar: null,
        text: 'running…',
        isRunning: true
      });
    });
  });

  describe('GIVEN a passed task whose summary matched a cache hit', () => {
    it('WHEN viewed THEN the text is seconds and HIT and the color is the passed theme variable', () => {
      const view = toRunView(entryIn({ state: 'passed', exitCode: 0, match: HIT_MATCH }));

      expect(view).toStrictEqual({ iconId: 'pass', colorVar: '--vscode-testing-iconPassed', text: '3.2s · HIT', isRunning: false });
    });
  });

  describe('GIVEN a stopped task', () => {
    it('WHEN viewed THEN a theme id without a dot becomes its variable unchanged', () => {
      const view = toRunView(entryIn({ state: 'stopped' }));

      expect(view.colorVar).toBe('--vscode-disabledForeground');
    });
  });

  describe('GIVEN a failed task', () => {
    it('WHEN viewed THEN the failed theme variable is used and isRunning is false', () => {
      const view = toRunView(entryIn({ state: 'failed', exitCode: 1 }));

      expect(view).toStrictEqual({ iconId: 'error', colorVar: '--vscode-testing-iconFailed', text: 'exit 1', isRunning: false });
    });
  });

  describe('GIVEN every state the tree can show', () => {
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
      const view = toRunView(undefined);

      expect(view.iconId).toBe(IDLE_ICON.id);
    });
  });
});
