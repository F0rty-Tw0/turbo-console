import type { RunToMatch } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { endStateOf, isMatchedEnd, runToMatchOf } from './run-end.util.ts';
import type { RunEntry, RunState } from '../common/run.type.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';

const ENDED: RunEntry = { ...RUN_ENTRY_STUB, state: 'failed', endedAt: 4000, exitCode: 1 };

describe('FEATURE: end state of a run', () => {
  describe.each([false, true])('GIVEN the user pressed Stop on a task whose persistent flag is %s', (persistent) => {
    it.each([1, 0, 129, undefined])('WHEN the process ends with exit code %s THEN the run is stopped', (exitCode) => {
      expect(endStateOf(true, exitCode, persistent, true)).toBe('stopped');
    });
  });

  describe('GIVEN no Stop on a task that is not continuous', () => {
    it('WHEN the process ends with exit code 0 THEN the run passed', () => {
      expect(endStateOf(false, 0, false, true)).toBe('passed');
    });

    it.each([1, 2, -1])('WHEN the process ends with exit code %d THEN the run failed', (exitCode) => {
      expect(endStateOf(false, exitCode, false, true)).toBe('failed');
    });

    it('WHEN the process ends with no exit code THEN the run failed', () => {
      expect(endStateOf(false, undefined, false, true)).toBe('failed');
    });
  });

  describe('GIVEN no Stop on a continuous task', () => {
    it('WHEN the process ends with exit code 0 (Ctrl+C in its terminal) THEN the run is stopped', () => {
      expect(endStateOf(false, 0, true, true)).toBe('stopped');
    });

    it('WHEN the process ends with no exit code (its terminal killed) THEN the run is stopped', () => {
      expect(endStateOf(false, undefined, true, true)).toBe('stopped');
    });

    it.each([1, 2, -1])('WHEN the process ends with exit code %d (it crashed) THEN the run failed', (exitCode) => {
      expect(endStateOf(false, exitCode, true, true)).toBe('failed');
    });
  });
});

describe('FEATURE: end state of a script run', () => {
  describe('GIVEN a script and no Stop', () => {
    it('WHEN the process ends with exit code 0 THEN the run passed', () => {
      expect(endStateOf(false, 0, false, false)).toBe('passed');
    });

    it.each([130, 3221225786])('WHEN the process ends with exit code %d (interrupted) THEN the run is stopped', (exitCode) => {
      expect(endStateOf(false, exitCode, false, false)).toBe('stopped');
    });

    it('WHEN the process ends with no exit code THEN the run is stopped', () => {
      expect(endStateOf(false, undefined, false, false)).toBe('stopped');
    });

    it.each([1, 3, 127, 9009])('WHEN the process ends with exit code %d THEN the run failed', (exitCode) => {
      expect(endStateOf(false, exitCode, false, false)).toBe('failed');
    });
  });

  describe('GIVEN a script with a Stop', () => {
    it.each([0, 1, 127])('WHEN the process ends with exit code %d THEN the run is stopped', (exitCode) => {
      expect(endStateOf(true, exitCode, false, false)).toBe('stopped');
    });
  });
});

describe('FEATURE: matched end', () => {
  it.each<[RunState, number | undefined, boolean]>([
    ['passed', 0, true],
    ['failed', 1, true],
    ['failed', undefined, false],
    ['stopped', 1, false],
    ['stopped', undefined, false]
  ])('GIVEN a %s run with exit code %s WHEN asked THEN a summary match follows: %s', (state, exitCode, expected) => {
    expect(isMatchedEnd(state, exitCode, true)).toBe(expected);
  });

  it.each<[RunState, number | undefined]>([
    ['passed', 0],
    ['failed', 1],
    ['failed', 127],
    ['stopped', 130]
  ])('GIVEN a %s script run with exit code %s WHEN asked THEN no summary match follows', (state, exitCode) => {
    expect(isMatchedEnd(state, exitCode, false)).toBe(false);
  });
});

describe('FEATURE: run to match of an entry', () => {
  describe('GIVEN an entry with an end time and an exit code', () => {
    it('WHEN read THEN it carries the task, package, process window and exit code', () => {
      const expected: RunToMatch = {
        task: ENDED.task,
        packageName: 'a',
        launchedAt: 1000,
        endedAt: 4000,
        exitCode: 1
      };

      expect(runToMatchOf(ENDED)).toStrictEqual(expected);
    });

    it('WHEN its process started after the launch THEN the window still starts at the launch', () => {
      const entry: RunEntry = { ...ENDED, processStartedAt: 1200 };

      expect(runToMatchOf(entry)?.launchedAt).toBe(1000);
    });
  });

  describe('GIVEN an entry missing part of its end', () => {
    it('WHEN it has no end time THEN there is nothing to match', () => {
      const entry: RunEntry = { ...ENDED, endedAt: null };

      expect(runToMatchOf(entry)).toBeNull();
    });

    it('WHEN it has no exit code THEN there is nothing to match', () => {
      const entry: RunEntry = { ...ENDED, exitCode: null };

      expect(runToMatchOf(entry)).toBeNull();
    });
  });
});
