import type { GraphRunsMessage } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { launchesOf, runsTextOf, withElapsedOf } from './graph-run-clock.util.ts';
import type { RunEntry } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { RunSources } from '../common/graph.type.ts';

const BUILD_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'ui#build', state: 'running', launchedAt: 1000 };
const LINT_PASSED: RunEntry = { ...BUILD_RUNNING, taskId: 'ui#lint', state: 'passed', endedAt: 1500, exitCode: 0 };
const BUILD_RUNS: GraphRunsMessage['runs'] = { 'ui#build': 'running' };
const MESSAGE: GraphRunsMessage = { type: 'runs', runs: BUILD_RUNS };
const BUILD_LAUNCH = { 'ui#build': 1000 };
const PROTOTYPE_IDS = ['__proto__', 'constructor'];

const runningEntryOf = (taskId: string): RunEntry => {
  const entry: RunEntry = { ...BUILD_RUNNING, taskId };

  return entry;
};

const lookupOf = (entries: RunEntry[]): Pick<RunSources, 'get'> => {
  const get = (root: string, taskId: string): RunEntry | undefined =>
    entries.find((entry) => entry.root === root && entry.taskId === taskId);
  const sources: Pick<RunSources, 'get'> = { get };

  return sources;
};

describe('FEATURE: the clock of the own live runs in a runs message', () => {
  describe('GIVEN ui#build running and ui#lint passed', () => {
    it('WHEN the launches are taken THEN only ui#build is named, with its launchedAt', () => {
      const launches = launchesOf('/ws', ['ui#build', 'ui#lint'], lookupOf([BUILD_RUNNING, LINT_PASSED]));

      expect(launches).toStrictEqual(BUILD_LAUNCH);
    });
  });

  describe('GIVEN own runs of ids named like Object.prototype members', () => {
    it('WHEN the launches are taken THEN each is an own key', () => {
      const entries = PROTOTYPE_IDS.map(runningEntryOf);

      const launches = launchesOf('/ws', PROTOTYPE_IDS, lookupOf(entries));

      expect(Object.keys(launches)).toStrictEqual(PROTOTYPE_IDS);
      expect(Object.getPrototypeOf(launches)).toBe(Object.prototype);
    });
  });

  describe('GIVEN a runs message', () => {
    it('WHEN no run is launched THEN the same message comes back', () => {
      const clocked = withElapsedOf(MESSAGE, {}, 65_000);

      expect(clocked).toBe(MESSAGE);
    });

    it.each([
      [65_000, 64_000],
      [500, 0]
    ])('WHEN ui#build launched at 1000 is read at %d THEN its elapsed is %d', (wallNow, ms) => {
      const clocked = withElapsedOf(MESSAGE, BUILD_LAUNCH, wallNow);

      expect(clocked.elapsed).toStrictEqual({ 'ui#build': ms });
    });

    it('WHEN its dedupe text is taken twice with a different elapsed THEN both texts are equal', () => {
      const early = withElapsedOf(MESSAGE, BUILD_LAUNCH, 2000);
      const late = withElapsedOf(MESSAGE, BUILD_LAUNCH, 9000);

      expect(runsTextOf(early, BUILD_LAUNCH)).toBe(runsTextOf(late, BUILD_LAUNCH));
    });

    it('WHEN its dedupe text is taken with another launch THEN the texts differ', () => {
      const relaunched = { 'ui#build': 1020 };

      expect(runsTextOf(MESSAGE, BUILD_LAUNCH)).not.toBe(runsTextOf(MESSAGE, relaunched));
    });
  });
});
