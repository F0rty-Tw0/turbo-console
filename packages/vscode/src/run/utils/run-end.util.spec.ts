import type { RunToMatch } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { endStateOf, isMatchedEnd, runToMatchOf } from './run-end.util.ts';
import type { RunEntry, RunState } from '../common/run.type.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';

const ENDED: RunEntry = { ...RUN_ENTRY_STUB, state: 'failed', endedAt: 4000, exitCode: 1 };

describe('FEATURE: end state of a run', () => {
  describe('GIVEN the user pressed Stop', () => {
    it.each([1, 0, 129, undefined])('WHEN the process ends with exit code %s THEN the run is stopped', (exitCode) => {
      expect(endStateOf(true, exitCode)).toBe('stopped');
    });
  });

  describe('GIVEN no Stop', () => {
    it('WHEN the process ends with exit code 0 THEN the run passed', () => {
      expect(endStateOf(false, 0)).toBe('passed');
    });

    it.each([1, 2, -1])('WHEN the process ends with exit code %d THEN the run failed', (exitCode) => {
      expect(endStateOf(false, exitCode)).toBe('failed');
    });

    it('WHEN the process ends with no exit code THEN the run failed', () => {
      expect(endStateOf(false, undefined)).toBe('failed');
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
    expect(isMatchedEnd(state, exitCode)).toBe(expected);
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
