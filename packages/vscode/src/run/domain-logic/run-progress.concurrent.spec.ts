import type { RunLogEvent, TaskOutcome } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunProgress } from './run-progress.ts';
import type { DependenciesOf, DisplayedRun, ProgressOwner } from '../common/run-progress.type.ts';
import type { RunEntry } from '../common/run.type.ts';
import { SEEN_UI } from '../test/common/run-progress.const.ts';
import { DEPENDENCIES_STUB, PROGRESS_OWNER_STUB } from '../test/stubs/run-progress.stub.ts';
import { RUN_ENTRY_STUB } from '../test/stubs/run.stub.ts';
import { dependenciesOfMap } from '../test/utils/run-progress.spec.util.ts';
import { displayRunOf } from '../utils/run-display.util.ts';

const WEB: ProgressOwner = PROGRESS_OWNER_STUB;

const WEB_RERUN: ProgressOwner = { ...WEB, launchedAt: 5000 };

const ADMIN: ProgressOwner = { ...WEB, taskId: 'admin#build', launchedAt: 1200 };

const A: ProgressOwner = { ...WEB, taskId: 'a#build', launchedAt: 1100 };

const DEPENDENCIES: DependenciesOf = dependenciesOfMap(DEPENDENCIES_STUB);

const SEEN_L: RunLogEvent = { kind: 'seen', taskId: 'l#build' };

const CACHED_UI: RunLogEvent = { kind: 'cacheHit', taskId: 'ui#build' };

const UI_FAILED: TaskOutcome[] = [{ taskId: 'ui#build', state: 'failed' }];

const UI_PASSED: TaskOutcome[] = [{ taskId: 'ui#build', state: 'passed' }];

const WEB_FAILED_AT_4000: RunEntry = {
  ...RUN_ENTRY_STUB,
  taskId: 'web#build',
  state: 'failed',
  endedAt: 4000,
  exitCode: 1,
  outcomes: UI_FAILED
};

const ADMIN_PASSED_AT_3000: RunEntry = {
  ...RUN_ENTRY_STUB,
  taskId: 'admin#build',
  launchedAt: 1200,
  state: 'passed',
  endedAt: 3000,
  exitCode: 0,
  outcomes: UI_PASSED
};

const OWN_UI_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'ui#build', launchedAt: 1100 };

const OWN_UI_PASSED: RunEntry = { ...OWN_UI_RUNNING, state: 'passed', endedAt: 2000, exitCode: 0 };

const OWN_L_RUNNING: RunEntry = { ...RUN_ENTRY_STUB, taskId: 'l#build', launchedAt: 1000 };

const OWN_L_PASSED: RunEntry = { ...OWN_L_RUNNING, state: 'passed', endedAt: 2000, exitCode: 0 };

const RUNNING_UNOWNED: DisplayedRun = { state: 'running', owner: null };

describe('FEATURE: concurrent runs that share a dependency (spec §5.3)', () => {
  let now: number;
  let progress: RunProgress;

  beforeEach(() => {
    now = 0;
    progress = new RunProgress((): number => now);
  });

  describe('GIVEN web#build (1000) and admin#build (1200) both run ui#build', () => {
    beforeEach(() => {
      progress.begin(WEB, DEPENDENCIES);
      progress.begin(ADMIN, DEPENDENCIES);
      now = 1300;
      progress.event(WEB, SEEN_UI);
      progress.event(ADMIN, SEEN_UI);
    });

    it('WHEN read THEN ui#build is running, owned by the newer admin#build', () => {
      const expected: DisplayedRun = { state: 'running', owner: 'admin#build' };
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN admin#build settled ui#build passed while web#build still runs it', () => {
    beforeEach(() => {
      progress.begin(WEB, DEPENDENCIES);
      progress.begin(ADMIN, DEPENDENCIES);
      now = 1300;
      progress.event(WEB, SEEN_UI);
      progress.event(ADMIN, SEEN_UI);
      progress.settle(ADMIN, ADMIN_PASSED_AT_3000);
    });

    it('WHEN read THEN ui#build is running, owned by web#build', () => {
      const expected: DisplayedRun = { state: 'running', owner: 'web#build' };
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN web#build settled ui#build failed at 4000 and admin#build settled it passed at 3000', () => {
    beforeEach(() => {
      progress.begin(WEB, DEPENDENCIES);
      progress.begin(ADMIN, DEPENDENCIES);
      progress.settle(ADMIN, ADMIN_PASSED_AT_3000);
      progress.settle(WEB, WEB_FAILED_AT_4000);
    });

    it('WHEN read THEN ui#build shows the newest end: failed, no owner', () => {
      const expected: DisplayedRun = { state: 'failed', owner: null };
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN ui#build runs on its own and in web#build', () => {
    beforeEach(() => {
      progress.begin(WEB, DEPENDENCIES);
      now = 1200;
      progress.event(WEB, SEEN_UI);
    });

    it('WHEN read THEN ui#build is running with no owner', () => {
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(OWN_UI_RUNNING, records);

      expect(shown).toStrictEqual(RUNNING_UNOWNED);
    });

    it('WHEN its own run then passes THEN ui#build is running, owned by web#build', () => {
      const expected: DisplayedRun = { state: 'running', owner: 'web#build' };
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(OWN_UI_PASSED, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN l#build own run at 1000 and a#build (1100) running l#build', () => {
    beforeEach(() => {
      progress.begin(A, DEPENDENCIES);
      now = 1200;
      progress.event(A, SEEN_L);
    });

    it('WHEN read THEN l#build is running with no owner', () => {
      const records = progress.recordsOf('/ws', 'l#build');

      const shown = displayRunOf(OWN_L_RUNNING, records);

      expect(shown).toStrictEqual(RUNNING_UNOWNED);
    });

    it('WHEN l#build then passes THEN it is running, owned by a#build', () => {
      const expected: DisplayedRun = { state: 'running', owner: 'a#build' };
      const records = progress.recordsOf('/ws', 'l#build');

      const shown = displayRunOf(OWN_L_PASSED, records);

      expect(shown).toStrictEqual(expected);
    });
  });

  describe('GIVEN the previous run of web#build (1000) is pending with ui#build passed at 1500', () => {
    beforeEach(() => {
      progress.begin(WEB, DEPENDENCIES);
      now = 1500;
      progress.event(WEB, CACHED_UI);
    });

    it('WHEN the rerun (5000) has ui#build print at 6000 THEN ui#build is running, owned by web#build', () => {
      const expected: DisplayedRun = { state: 'running', owner: 'web#build' };

      progress.begin(WEB_RERUN, DEPENDENCIES);
      now = 6000;
      progress.event(WEB_RERUN, SEEN_UI);
      const records = progress.recordsOf('/ws', 'ui#build');

      const shown = displayRunOf(undefined, records);

      expect(shown).toStrictEqual(expected);
    });
  });
});
