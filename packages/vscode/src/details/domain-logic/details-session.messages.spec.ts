import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsSession } from './details-session.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { UNPRINTABLE_MESSAGE } from '../common/details.const.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import {
  A_PACKAGE_STUB,
  DETAILS_LOADED_STUB,
  DETAILS_MODEL_STUB,
  PANEL_KEY_STUB,
  TEST_TASK_STUB
} from '../test/stubs/details-model.stub.ts';
import { deferDryRuns } from '../test/utils/deferred-dry-runs.spec.util.ts';

const BUILD_ROW = { kind: 'task', root: '/ws', key: 'a#build', packageName: 'a' };
const LOAD_FAILED: LoadFailure = { kind: 'error', stage: 'load', error: new TurboException('failed', 'turbo exited 1') };
const WITHOUT_BUILD = { ...A_PACKAGE_STUB, tasks: [TEST_TASK_STUB] };
const MODEL_WITHOUT_BUILD = { ...DETAILS_MODEL_STUB, packages: [WITHOUT_BUILD] };
const RELOADED_WITHOUT_BUILD = { ...DETAILS_LOADED_STUB, model: MODEL_WITHOUT_BUILD };
const HIDDEN_CONTROLS = /[\u202E\u009B\u2028\u2029]/u;
const THROWING_TYPE = {
  get type(): string {
    throw new Error('getter trap');
  }
};

describe('FEATURE: details session messages', () => {
  let store: RootStore;
  let coordinator: Coordinator;
  let ports: DetailsPorts;
  let session: DetailsSession;

  beforeEach(() => {
    store = new RootStore();
    coordinator = coordinatorMock();
    store.set([ROOT_FOLDER_STUB], () => coordinator);
    store.apply('/ws', DETAILS_LOADED_STUB);
    ports = detailsPortsMock();
    deferDryRuns(ports);
    session = new DetailsSession(PANEL_KEY_STUB, store, new RunStore(), ports);
  });

  describe('GIVEN a shown panel that has no state yet', () => {
    beforeEach(() => {
      session.setVisible(true);
    });

    it('WHEN a run of one of its tasks arrives THEN it is dropped, since no task ids exist yet', async () => {
      await session.receive({ type: 'run', taskId: 'a#build' });

      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN a dry-run refresh arrives THEN no dry run starts', async () => {
      await session.receive({ type: 'refresh', scope: 'dryRun' });

      expect(ports.dryRun).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a shown, ready panel whose root has loaded', () => {
    beforeEach(async () => {
      session.setVisible(true);
      await session.start();
      await session.receive({ type: 'ready' });
    });

    it.each([
      ['run', 'turboConsole.runTask'],
      ['stop', 'turboConsole.stopTask'],
      ['copy', 'turboConsole.copyCommand']
    ])('WHEN %s of a panel task arrives THEN it executes %s on that task row', async (type, command) => {
      await session.receive({ type, taskId: 'a#build' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith(command, BUILD_ROW);
    });

    it('WHEN a run names another root and package THEN only its task id is used, with the panel root and package', async () => {
      await session.receive({ type: 'run', taskId: 'a#build', root: '/evil', packageName: 'web' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', BUILD_ROW);
    });

    it('WHEN openPackageJson arrives THEN it opens the panel package manifest', async () => {
      await session.receive({ type: 'openPackageJson' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.openPackageJson', {
        kind: 'pkg',
        root: '/ws',
        packageName: 'a'
      });
    });

    it('WHEN showOutput arrives THEN it shows the output', async () => {
      await session.receive({ type: 'showOutput' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.showOutput', undefined);
    });

    it('WHEN a root refresh arrives THEN only its own root reloads, through its coordinator', async () => {
      await session.receive({ type: 'refresh', scope: 'root' });

      expect(coordinator.request).toHaveBeenCalledExactlyOnceWith('refresh');
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN the command rejects THEN the failure is logged and receive resolves', async () => {
      vi.mocked(ports.execute).mockRejectedValue(new Error('command failed'));
      await session.receive({ type: 'showOutput' });

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('command failed');
    });

    it('WHEN a reload fails at the binary stage and run arrives THEN the binary text is shown and nothing executes', async () => {
      store.apply('/ws', LOAD_FAILURE_STUB);
      await session.receive({ type: 'run', taskId: 'a#build' });

      expect(ports.info).toHaveBeenCalledExactlyOnceWith(MESSAGE_TEXTS['binary-not-found']);
      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN a reload fails at the binary stage and stop arrives THEN it still executes', async () => {
      store.apply('/ws', LOAD_FAILURE_STUB);
      await session.receive({ type: 'stop', taskId: 'a#build' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.stopTask', BUILD_ROW);
    });

    it('WHEN a reload fails at the load stage and run arrives THEN it still executes', async () => {
      store.apply('/ws', LOAD_FAILED);
      await session.receive({ type: 'run', taskId: 'a#build' });

      expect(ports.execute).toHaveBeenCalledExactlyOnceWith('turboConsole.runTask', BUILD_ROW);
    });

    it('WHEN the task leaves the model and its run arrives THEN the ids of the current state drop it', async () => {
      store.apply('/ws', RELOADED_WITHOUT_BUILD);
      await session.receive({ type: 'run', taskId: 'a#build' });

      expect(ports.execute).not.toHaveBeenCalled();
    });

    it('WHEN a message with bidi, C1 and line separator controls is dropped THEN the logged text has none', async () => {
      await session.receive({ type: 'run\u202E\u009B\u2028\u2029' });

      const [line] = vi.mocked(ports.log).mock.calls[0] ?? [''];

      expect(line).toContain('run');
      expect(line).not.toMatch(HIDDEN_CONTROLS);
    });

    it('WHEN a message with a pair the 200-unit cut splits is dropped THEN the logged text is well formed', async () => {
      await session.receive({ type: `${'x'.repeat(190)}\u{1F600}` });

      const [line] = vi.mocked(ports.log).mock.calls[0] ?? [''];

      expect(line).toContain('xxx');
      expect(line.isWellFormed()).toBe(true);
    });

    it('WHEN a message whose type getter throws arrives THEN receive resolves and logs it as dropped', async () => {
      await session.receive(THROWING_TYPE);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`Dropped a webview message: ${UNPRINTABLE_MESSAGE}`);
    });

    it('WHEN disposed and a run of a panel task arrives THEN nothing executes', async () => {
      session.dispose();
      await session.receive({ type: 'run', taskId: 'a#build' });

      expect(ports.execute).not.toHaveBeenCalled();
    });
  });
});
