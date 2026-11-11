import type { RunExtras } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { LOG_ENV_STUB, RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

const FULL: RunExtras = { only: true, continueMode: 'dependencies-successful', concurrency: '50%', passThrough: ['--watch'] };

const withExtras = (extras: RunExtras, force = false): RunRequest => {
  const request: RunRequest = { ...RUN_REQUEST_STUB, force, extras };

  return request;
};

const ONLY: RunExtras = { only: true };
const KEEP_GOING: RunExtras = { continueMode: 'dependencies-successful' };
const CONCURRENCY: RunExtras = { concurrency: '4' };
const PASS_THROUGH: RunExtras = { passThrough: ['--watch', '--port=3000'] };
const EMPTY_PASS_THROUGH: RunExtras = { passThrough: [] };

const ALL_WORDS = ['--force', '--only', '--continue=dependencies-successful', '--concurrency=50%', '--', '--watch'];

describe('FEATURE: run flow, Run with Options', () => {
  let store: RunStore;
  let ports: RunPorts;
  let execution: Terminable;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new RunStore();
    execution = { terminate: vi.fn() };
    ports = fakeRunPorts(execution);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe.each<[string, RunRequest, string[]]>([
    ['only', withExtras(ONLY), ['--only']],
    ['keep going', withExtras(KEEP_GOING), ['--continue=dependencies-successful']],
    ['concurrency', withExtras(CONCURRENCY), ['--concurrency=4']],
    ['pass-through', withExtras(PASS_THROUGH), ['--', '--watch', '--port=3000']],
    ['an empty pass-through', withExtras(EMPTY_PASS_THROUGH), []],
    ['all five with force', withExtras(FULL, true), ALL_WORDS]
  ])('GIVEN a request with %s', (_name, request, words) => {
    it('WHEN it is run THEN turbo gets the base arguments and exactly those words', async () => {
      await runTask(store, ports, request);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(request, [...ARGS, ...words], 1000, LOG_ENV_STUB);
    });
  });

  describe('GIVEN a single-package request with all five', () => {
    it('WHEN it is run THEN --single-package comes before --force', async () => {
      const forced = withExtras(FULL, true);
      const request: RunRequest = { ...forced, packageName: '//', singlePackage: true };
      const base = ['--skip-infer', 'run', 'build', '--filter=//', '--summarize', '--single-package'];

      await runTask(store, ports, request);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(request, [...base, ...ALL_WORDS], 1000, LOG_ENV_STUB);
    });
  });

  describe('GIVEN a request with extras', () => {
    it('WHEN it is run THEN the stored entry carries them', async () => {
      await runTask(store, ports, withExtras(ONLY));

      expect(store.get('/ws', 'build')?.extras).toStrictEqual(ONLY);
    });

    it('WHEN it is run THEN the progress still begins once, as for a plain run', async () => {
      await runTask(store, ports, withExtras(ONLY));

      expect(ports.progress.begin).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a force-only request', () => {
    it('WHEN it is run THEN the stored entry has no extras key', async () => {
      const forced: RunRequest = { ...RUN_REQUEST_STUB, force: true };

      await runTask(store, ports, forced);

      const entry = store.get('/ws', 'build');

      expect(Object.keys(entry ?? {})).not.toContain('extras');
    });
  });

  describe.each<[string, RunExtras]>([
    ['a concurrency with a leading space', { concurrency: ' 2' }],
    ['a concurrency of 0', { concurrency: '0' }],
    ['a pass-through arg with a space', { passThrough: ['a b'] }]
  ])('GIVEN %s', (_name, extras) => {
    let failing: RunPorts;

    beforeEach(async () => {
      failing = fakeRunPorts(execution);
      await runTask(store, failing, withExtras(extras));
    });

    it('WHEN it is run THEN nothing launches and the entry ends as failed to start', () => {
      expect(failing.execute).not.toHaveBeenCalled();
      expect(store.get('/ws', 'build')?.state).toBe('failed-to-start');
    });

    it('WHEN it is run THEN the core reason is logged and the user is told turbo could not start', () => {
      expect(failing.log).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^turbo invalid-argument: /));
      expect(failing.notifyFailedToStart).toHaveBeenCalledExactlyOnceWith('turbo');
    });
  });

  describe('GIVEN a script request with extras', () => {
    it('WHEN it is run THEN executeScript gets the request unchanged and turbo is never executed', async () => {
      const request: RunRequest = {
        ...RUN_REQUEST_STUB,
        task: { ...TASK_NODE_STUB, isTurboTask: false },
        extras: { passThrough: ['--watch'] }
      };

      await runTask(store, ports, request);

      expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith(request, 1000);
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN its name is unsafe THEN the refusal shows before any launch, extras or not', async () => {
      const task = { ...TASK_NODE_STUB, name: 'a b', isTurboTask: false };
      const request: RunRequest = { ...RUN_REQUEST_STUB, task, extras: { passThrough: ['--watch'] } };

      await runTask(store, ports, request);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith("Turbo Console can't run a script named `a b` safely.");
      expect(ports.executeScript).not.toHaveBeenCalled();
    });
  });
});
