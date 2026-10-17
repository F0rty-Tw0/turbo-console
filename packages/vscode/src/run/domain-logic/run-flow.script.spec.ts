import type { TaskNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import { PACKAGE_MANAGER_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { ALREADY_RUNNING_TEXT, NOT_TURBO_FORCE_TEXT, START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunDefinition, RunPorts, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, task: SCRIPT_TASK };

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const named = (name: string): RunRequest => {
  const task: TaskNode = { ...SCRIPT_TASK, name };
  const request: RunRequest = { ...SCRIPT, task };

  return request;
};

const unsafeText = (name: string): string => `Turbo Console can't run a script named \`${name}\` safely.`;

describe('FEATURE: run flow, a script', () => {
  let store: RunStore;
  let ports: RunPorts;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new RunStore();

    const execution: Terminable = { terminate: vi.fn() };

    ports = fakeRunPorts(execution);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a script of package a', () => {
    it('WHEN it is run THEN the script launches once in its package dir without the binary check', async () => {
      await runTask(store, ports, SCRIPT);

      expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith(SCRIPT, 1000);
      expect(ports.canExecute).not.toHaveBeenCalled();
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN its entry names the package manager and never waits for a match', async () => {
      await runTask(store, ports, SCRIPT);

      const entry = store.get('/ws', 'build');

      expect(entry?.packageManager).toStrictEqual(PACKAGE_MANAGER_STUB);
      expect(entry?.matching).toBe(false);
    });

    it('WHEN it is run twice THEN the second says Already running and launches nothing', async () => {
      await runTask(store, ports, SCRIPT);

      await runTask(store, ports, SCRIPT);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      expect(ports.executeScript).toHaveBeenCalledOnce();
    });

    it('WHEN VS Code already runs a task of it THEN it says Already running and launches nothing', async () => {
      const isActive = vi.fn().mockReturnValue(true);
      const elsewhere = fakeRunPorts({ terminate: vi.fn() }, { isActive });

      await runTask(store, elsewhere, SCRIPT);

      expect(elsewhere.info).toHaveBeenCalledExactlyOnceWith(ALREADY_RUNNING_TEXT);
      expect(elsewhere.executeScript).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a script of the root package', () => {
    it('WHEN its package dir is the root THEN it launches there', async () => {
      const request: RunRequest = { ...SCRIPT, packageDir: '/ws' };

      await runTask(store, ports, request);

      expect(ports.executeScript).toHaveBeenCalledExactlyOnceWith(request, 1000);
    });
  });

  describe.each([
    ['a parent of the root', '/x'],
    ['an absolute path outside the root', '/etc/x'],
    ['a sibling that shares the root prefix', '/ws-other']
  ])('GIVEN a script whose package dir is %s', (_name, packageDir) => {
    const request: RunRequest = { ...SCRIPT, packageDir };

    it('WHEN it is run THEN the unsafe script text shows and nothing launches', async () => {
      await runTask(store, ports, request);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(unsafeText('build'));
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN no run is stored and no watchdog is armed', async () => {
      await runTask(store, ports, request);

      expect(store.get('/ws', 'build')).toBeUndefined();
      expect(ports.after).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an atom-umbrella script row with no command', () => {
    const task: TaskNode = { ...SCRIPT_TASK, kind: 'atom-umbrella', command: null };
    const request: RunRequest = { ...SCRIPT, task };

    it('WHEN it is run THEN the unsafe script text shows and nothing launches', async () => {
      await runTask(store, ports, request);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(unsafeText('build'));
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN no run is stored and no watchdog is armed', async () => {
      await runTask(store, ports, request);

      expect(store.get('/ws', 'build')).toBeUndefined();
      expect(ports.after).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['holds a space', 'a b'],
    ['holds a dollar sign', 'a$b'],
    ['holds a semicolon', 'a;b'],
    ['starts with a dash', '-x'],
    ['holds a hash', 'a#b'],
    ['starts with an equals sign', '=a'],
    ['starts with an at sign', '@a']
  ])('GIVEN a script whose name %s', (_name, name) => {
    it('WHEN it is run THEN the unsafe script text names it and nothing launches', async () => {
      await runTask(store, ports, named(name));

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(unsafeText(name));
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN no run is stored and no watchdog is armed', async () => {
      await runTask(store, ports, named(name));

      expect(store.get('/ws', 'build')).toBeUndefined();
      expect(ports.after).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a script name with a control character WHEN it is run THEN the text shows it cleaned', async () => {
    await runTask(store, ports, named('a\u0007 b'));

    expect(ports.info).toHaveBeenCalledExactlyOnceWith(unsafeText('a b'));
  });

  describe('GIVEN a forced run of a script', () => {
    const forced: RunRequest = { ...SCRIPT, force: true };

    it('WHEN it is run THEN the text says Run Without Cache only applies to turbo tasks and nothing launches', async () => {
      await runTask(store, ports, forced);

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(NOT_TURBO_FORCE_TEXT);
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN no run is stored and no watchdog is armed', async () => {
      await runTask(store, ports, forced);

      expect(store.get('/ws', 'build')).toBeUndefined();
      expect(ports.after).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a turbo task', () => {
    it('WHEN it is run THEN turbo launches with --summarize and the script port stays unused', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(RUN_REQUEST_STUB, expect.arrayContaining(['--summarize']), 1000);
      expect(ports.canExecute).toHaveBeenCalledOnce();
      expect(ports.executeScript).not.toHaveBeenCalled();
    });

    it('WHEN it is run THEN its entry names no package manager', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);

      expect(store.get('/ws', 'build')?.packageManager).toBeNull();
    });

    it('WHEN its task ends before its process starts THEN the failed to start notice names turbo', async () => {
      await runTask(store, ports, RUN_REQUEST_STUB);

      taskEnded(store, ports, RUN, 1000);

      expect(ports.notifyFailedToStart).toHaveBeenCalledExactlyOnceWith('turbo');
    });
  });

  describe('GIVEN a script whose launch never settles', () => {
    beforeEach(async () => {
      const launch = Promise.withResolvers<Terminable>();
      const executeScript = vi.fn().mockReturnValue(launch.promise);

      ports = fakeRunPorts({ terminate: vi.fn() }, { executeScript });
      void runTask(store, ports, SCRIPT);
      await vi.advanceTimersByTimeAsync(0);
    });

    it('WHEN the start timeout passes THEN the log names the package manager and the run ends as failed to start', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('pnpm process did not start within 10 s');
      expect(store.get('/ws', 'build')?.state).toBe('failed-to-start');
    });

    it('WHEN the start timeout passes THEN the failed to start notice names the package manager', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      expect(ports.notifyFailedToStart).toHaveBeenCalledExactlyOnceWith('pnpm');
    });
  });

  describe('GIVEN a script VS Code accepted whose process never starts', () => {
    beforeEach(async () => {
      await runTask(store, ports, SCRIPT);
    });

    it('WHEN the start timeout passes THEN the log names the package manager and the run keeps running', () => {
      vi.advanceTimersByTime(START_TIMEOUT_MS);

      const text = 'pnpm process has not started after 10 s; VS Code may be waiting on a save prompt or an input';

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(text);
      expect(store.get('/ws', 'build')?.state).toBe('running');
    });

    it('WHEN its task ends THEN the failed to start notice names the package manager', () => {
      taskEnded(store, ports, RUN, 1000);

      expect(ports.notifyFailedToStart).toHaveBeenCalledExactlyOnceWith('pnpm');
    });
  });

  it('GIVEN a script whose launch rejects WHEN it is run THEN the error is logged and the notice names the package manager', async () => {
    const executeScript = vi.fn().mockRejectedValue(new Error('no folder'));
    const rejecting = fakeRunPorts({ terminate: vi.fn() }, { executeScript });

    await runTask(store, rejecting, SCRIPT);

    expect(rejecting.log).toHaveBeenCalledOnce();
    expect(rejecting.notifyFailedToStart).toHaveBeenCalledExactlyOnceWith('pnpm');
  });
});
