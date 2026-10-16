import type { PackageManager, PackageManagerSource, TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunDefinition, RunEvent, RunPorts, RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const THIS_RUN: RunEvent = { definition: RUN, launchedAt: 1000 };

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, isTurboTask: false };

const LOCKFILE_SOURCE: PackageManagerSource = { kind: 'lockfile', file: 'pnpm-lock.yaml' };

const LOCKFILE_MANAGER: PackageManager = { name: 'pnpm', source: LOCKFILE_SOURCE };

const FIELD_SOURCE: PackageManagerSource = { kind: 'field' };

const FIELD_MANAGER: PackageManager = { name: 'pnpm', source: FIELD_SOURCE };

const SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, task: SCRIPT_TASK, packageManager: LOCKFILE_MANAGER };

const FIELD_SCRIPT: RunRequest = { ...SCRIPT, packageManager: FIELD_MANAGER };

const TAIL = 'or one the script runs. Install it or check packageManager.';

describe('FEATURE: run session, the end of a script', () => {
  let ports: RunPorts;
  let session: RunSession;

  const endWith = async (request: RunRequest, exitCode: number): Promise<void> => {
    await session.run(request);
    session.processStarted(THIS_RUN);
    session.processEnded(THIS_RUN, exitCode);
    await vi.waitFor(() => expect(session.runs.get(RUN.root, RUN.id)?.matching).toBe(false));
  };

  beforeEach(() => {
    ports = fakeRunPorts({ terminate: vi.fn() });
    session = new RunSession(ports, []);
  });

  describe('GIVEN a script whose manager came from a lockfile', () => {
    it('WHEN it ends with exit 127 THEN one hedged line names the manager and the lockfile, and the run failed', async () => {
      await endWith(SCRIPT, 127);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`exit 127: a command was not found: pnpm (from pnpm-lock.yaml) ${TAIL}`);
      expect(session.runs.get(RUN.root, RUN.id)?.state).toBe('failed');
      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });

    it.each([1, 3])('WHEN it ends with exit %d THEN nothing is logged', async (exitCode) => {
      await endWith(SCRIPT, exitCode);

      expect(ports.log).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a script whose manager came from the packageManager field', () => {
    it('WHEN it ends with exit 9009 THEN the line has the exit 9009 form and no notice shows', async () => {
      await endWith(FIELD_SCRIPT, 9009);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`exit 9009: a command was not found: pnpm (from packageManager) ${TAIL}`);
      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a turbo task', () => {
    it('WHEN it ends with exit 127 THEN nothing new is logged', async () => {
      await session.run(RUN_REQUEST_STUB);
      session.processStarted(THIS_RUN);
      session.processEnded(THIS_RUN, 127);
      await vi.waitFor(() => expect(session.runs.get(RUN.root, RUN.id)?.matching).toBe(false));

      expect(ports.log).not.toHaveBeenCalled();
    });
  });
});
