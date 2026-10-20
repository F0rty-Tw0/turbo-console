import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsSession } from './details-session.ts';
import type { LoadFailure } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { flushSettles, settledFlag } from '../../roots/test/utils/deferred-ports.spec.util.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { MESSAGE_TEXTS } from '../../tree/common/message.const.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import type { DeferredDryRun } from '../test/common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import {
  A_PACKAGE_STUB,
  CHECK_TASK_STUB,
  DETAILS_LOADED_STUB,
  DETAILS_MODEL_STUB,
  DRY_RUN_STATE_STUB,
  PANEL_KEY_STUB,
  WEB_PACKAGE_STUB
} from '../test/stubs/details-model.stub.ts';
import { deferDryRuns, dryRunAt, postedPhasesOf, postedStatesOf } from '../test/utils/deferred-dry-runs.spec.util.ts';

const ABORTED = new TurboException('failed', 'This operation was aborted');
const FAILED = new TurboException('failed', 'turbo exited 1');
const LOAD_FAILED: LoadFailure = loadFailureOf('load', FAILED);
const MODEL_WITHOUT_A = { ...DETAILS_MODEL_STUB, packages: [WEB_PACKAGE_STUB] };
const WITHOUT_A = { ...DETAILS_LOADED_STUB, model: MODEL_WITHOUT_A };
const UMBRELLA_ONLY = { ...A_PACKAGE_STUB, tasks: [CHECK_TASK_STUB] };
const NO_COMMAND_MODEL = { ...DETAILS_MODEL_STUB, packages: [UMBRELLA_ONLY] };
const NO_COMMAND = { ...DETAILS_LOADED_STUB, model: NO_COMMAND_MODEL };

/** Successful reloads: each a new model object with equal fields, as every reload makes. */
const RELOADED_MODEL = { ...DETAILS_MODEL_STUB };
const RELOADED = { ...DETAILS_LOADED_STUB, model: RELOADED_MODEL };
const RELOADED_MODEL_AGAIN = { ...DETAILS_MODEL_STUB };
const RELOADED_AGAIN = { ...DETAILS_LOADED_STUB, model: RELOADED_MODEL_AGAIN };

describe('FEATURE: details session dry runs', () => {
  let store: RootStore;
  let runStore: RunStore;
  let ports: DetailsPorts;
  let dryRuns: DeferredDryRun[];
  let session: DetailsSession;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    store.apply('/ws', DETAILS_LOADED_STUB);
    runStore = new RunStore();
    ports = detailsPortsMock();
    dryRuns = deferDryRuns(ports);
    session = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);
  });

  describe('GIVEN a shown, ready panel with its first dry run in flight', () => {
    beforeEach(async () => {
      session.setVisible(true);
      session.start();
      await session.receive({ type: 'ready' });
    });

    it('THEN the dry run asks for the package tasks that have a command', () => {
      expect(dryRunAt(dryRuns, 0).request).toStrictEqual({ tasks: ['test', 'build'], packages: ['a'], singlePackage: false });
    });

    describe('WHEN the model changes', () => {
      beforeEach(() => {
        store.apply('/ws', RELOADED);
      });

      it('THEN the dry run in flight is aborted', () => {
        expect(dryRunAt(dryRuns, 0).signal.aborted).toBe(true);
      });

      it('THEN exactly one new dry run starts', () => {
        expect(ports.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN the aborted run rejecting posts no failed state', async () => {
        dryRunAt(dryRuns, 0).reject(ABORTED);
        await flushSettles();

        expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'loading']);
      });

      it('THEN a late result of the superseded run is dropped', async () => {
        dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
        await flushSettles();

        expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'loading']);
      });
    });

    it('WHEN a reload fails and keeps the model THEN the state carries the reload error and no dry run starts', () => {
      store.apply('/ws', LOAD_FAILED);

      const [last] = postedStatesOf(ports).slice(-1);

      expect(last).toMatchObject({ kind: 'package', reloadError: MESSAGE_TEXTS['load-with-model'] });
      expect(ports.dryRun).toHaveBeenCalledOnce();
    });

    describe('WHEN the dry run fails on its own', () => {
      beforeEach(async () => {
        dryRunAt(dryRuns, 0).reject(FAILED);
        await flushSettles();
      });

      it('THEN the failed state is posted', () => {
        expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'failed']);
      });

      it('THEN the failure is logged', () => {
        expect(ports.log).toHaveBeenCalledExactlyOnceWith('turbo failed: turbo exited 1');
      });
    });

    describe('WHEN a dry-run refresh arrives', () => {
      beforeEach(async () => {
        await session.receive({ type: 'refresh', scope: 'dryRun' });
      });

      it('THEN the dry run in flight is aborted', () => {
        expect(dryRunAt(dryRuns, 0).signal.aborted).toBe(true);
      });

      it('THEN exactly one new dry run starts', () => {
        expect(ports.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN the new run listing states posts the ready state', async () => {
        dryRunAt(dryRuns, 1).resolve([DRY_RUN_STATE_STUB]);
        await flushSettles();

        expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'loading', 'ready']);
      });
    });

    it('WHEN the package leaves the model THEN missing is posted and no dry run starts', () => {
      store.apply('/ws', WITHOUT_A);

      const [last] = postedStatesOf(ports).slice(-1);

      expect(last).toStrictEqual({ kind: 'missing', root: '/ws', packageName: 'a' });
      expect(ports.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN the package leaves the model and comes back THEN the package state and a dry run return', () => {
      store.apply('/ws', WITHOUT_A);
      store.apply('/ws', RELOADED);

      const [last] = postedStatesOf(ports).slice(-1);

      expect(last).toMatchObject({ kind: 'package', dryRun: 'loading' });
      expect(ports.dryRun).toHaveBeenCalledTimes(2);
    });

    it('WHEN the new model leaves the package no task with a command THEN no dry run starts and the state is ready', () => {
      store.apply('/ws', NO_COMMAND);

      expect(ports.dryRun).toHaveBeenCalledOnce();
      expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'ready']);
    });
  });

  describe('GIVEN a ready panel hidden while its dry run is in flight', () => {
    beforeEach(async () => {
      session.setVisible(true);
      session.start();
      await session.receive({ type: 'ready' });
      session.setVisible(false);
    });

    it('WHEN the model changes THEN the dry run is aborted, nothing starts and nothing is posted', () => {
      store.apply('/ws', RELOADED);

      expect(dryRunAt(dryRuns, 0).signal.aborted).toBe(true);
      expect(ports.dryRun).toHaveBeenCalledOnce();
      expect(ports.post).toHaveBeenCalledOnce();
    });

    it('WHEN shown again with no change deferred THEN no dry run starts', () => {
      session.setVisible(true);

      expect(ports.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN the model changes and the panel shows a root with no reload pending THEN one dry run starts', () => {
      store.apply('/ws', RELOADED);
      session.setVisible(true);

      expect(ports.dryRun).toHaveBeenCalledTimes(2);
    });

    describe('WHEN the model changes and the panel shows a root with a watcher reload pending', () => {
      beforeEach(() => {
        store.apply('/ws', RELOADED);
        vi.mocked(ports.isStale).mockReturnValue(true);
        session.setVisible(true);
      });

      it('THEN no dry run starts before the reload settles', () => {
        expect(ports.dryRun).toHaveBeenCalledOnce();
      });

      it('THEN the reload settling with a model starts one dry run', () => {
        store.apply('/ws', RELOADED_AGAIN);

        expect(ports.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN the reload failing starts one dry run on the kept model', () => {
        store.apply('/ws', LOAD_FAILED);

        expect(ports.dryRun).toHaveBeenCalledTimes(2);
      });

      it('THEN hiding it again once the reload is no longer pending starts no dry run', () => {
        vi.mocked(ports.isStale).mockReturnValue(false);
        session.setVisible(false);

        expect(ports.dryRun).toHaveBeenCalledOnce();
      });
    });

    it('WHEN the model changes, the rebuilt page sends ready and the panel shows a root with a reload pending THEN one state is posted and no dry run starts', async () => {
      store.apply('/ws', RELOADED);
      vi.mocked(ports.isStale).mockReturnValue(true);
      await session.receive({ type: 'ready' });
      vi.mocked(ports.post).mockClear();
      session.setVisible(true);

      expect(postedPhasesOf(ports)).toStrictEqual(['loading']);
      expect(ports.dryRun).toHaveBeenCalledOnce();
    });

    describe('WHEN a dry-run refresh arrives', () => {
      beforeEach(async () => {
        await session.receive({ type: 'refresh', scope: 'dryRun' });
      });

      it('THEN no dry run starts while hidden', () => {
        expect(ports.dryRun).toHaveBeenCalledOnce();
      });

      it('THEN showing the panel again starts one dry run', () => {
        session.setVisible(true);

        expect(ports.dryRun).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('GIVEN a panel started while hidden', () => {
    beforeEach(() => {
      session.start();
    });

    it('THEN no dry run starts', () => {
      expect(ports.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN shown THEN one dry run starts', () => {
      session.setVisible(true);

      expect(ports.dryRun).toHaveBeenCalledOnce();
    });
  });

  it('GIVEN a dry run in flight WHEN it settles THEN whenIdle resolves only after it', async () => {
    session.setVisible(true);
    session.start();

    const isIdle = settledFlag(session.whenIdle());

    await flushSettles();

    const wasIdleEarly = isIdle();

    dryRunAt(dryRuns, 0).resolve([]);
    await flushSettles();

    expect(wasIdleEarly).toBe(false);
    expect(isIdle()).toBe(true);
  });
});
