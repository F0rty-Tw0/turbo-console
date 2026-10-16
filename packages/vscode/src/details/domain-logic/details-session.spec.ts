import { TurboException } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsSession } from './details-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { flushSettles } from '../../roots/test/utils/deferred-ports.spec.util.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import type { DeferredDryRun } from '../test/common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import {
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_LOADED_STUB,
  DETAILS_MODEL_STUB,
  DRY_RUN_STATE_STUB,
  PANEL_KEY_STUB,
  TEST_TASK_STUB,
  WEB_BUILD_TASK_STUB
} from '../test/stubs/details-model.stub.ts';
import { deferDryRuns, dryRunAt, postedOf, postedPhasesOf } from '../test/utils/deferred-dry-runs.spec.util.ts';

const ABORTED = new TurboException('failed', 'This operation was aborted');
const OTHER_FOLDER = { root: '/other', name: 'other' };
const WITHOUT_BUILD = { ...A_PACKAGE_STUB, tasks: [TEST_TASK_STUB] };
const CACHED_MODEL = { ...DETAILS_MODEL_STUB };
const CACHE_FIRST = { ...DETAILS_LOADED_STUB, model: CACHED_MODEL, fromCache: true };
const MODEL_WITHOUT_BUILD = { ...DETAILS_MODEL_STUB, packages: [WITHOUT_BUILD] };
const RELOADED_WITHOUT_BUILD = { ...DETAILS_LOADED_STUB, model: MODEL_WITHOUT_BUILD };
const OTHER_MODEL = { ...DETAILS_MODEL_STUB };
const OTHER_LOADED = { ...DETAILS_LOADED_STUB, model: OTHER_MODEL };
const RUNNING = { isRunning: true };
const RUN_A_BUILD = { root: '/ws', packageName: 'a', task: BUILD_TASK_STUB, binaryPath: '/bin/turbo', force: false };
const RUN_WEB_BUILD = { root: '/ws', packageName: 'web', task: WEB_BUILD_TASK_STUB, binaryPath: '/bin/turbo', force: false };
const RUN_OTHER_ROOT_A_BUILD = { ...RUN_A_BUILD, root: '/other' };

describe('FEATURE: details session', () => {
  let store: RootStore;
  let runStore: RunStore;
  let ports: DetailsPorts;
  let dryRuns: DeferredDryRun[];
  let session: DetailsSession;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB, OTHER_FOLDER], () => coordinatorMock());
    store.apply('/ws', DETAILS_LOADED_STUB);
    runStore = new RunStore();
    ports = detailsPortsMock();
    dryRuns = deferDryRuns(ports);
    session = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);
  });

  describe('GIVEN a shown panel not started yet, as while its opener awaits the root load', () => {
    beforeEach(() => {
      session.setVisible(true);
    });

    it('WHEN the cache-first model is published THEN no dry run starts', async () => {
      store.apply('/ws', CACHE_FIRST);
      await flushSettles();

      expect(ports.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN it starts after a cache-first publish THEN exactly one dry run starts', () => {
      store.apply('/ws', CACHE_FIRST);
      session.start();

      expect(ports.dryRun).toHaveBeenCalledOnce();
    });

    it('WHEN disposed before it starts THEN no dry run starts, then or on a later model', () => {
      session.dispose();
      session.start();
      store.apply('/ws', RELOADED_WITHOUT_BUILD);

      expect(ports.dryRun).not.toHaveBeenCalled();
    });

    it('WHEN disposed before it starts THEN it never subscribes to the roots or the runs', () => {
      const onRoots = vi.spyOn(store, 'onDidChange');
      const onRuns = vi.spyOn(runStore, 'onDidChange');

      session.dispose();
      session.start();

      expect(onRoots).not.toHaveBeenCalled();
      expect(onRuns).not.toHaveBeenCalled();
    });
  });

  it('GIVEN a shown panel that has no state yet WHEN ready arrives THEN nothing is posted', async () => {
    session.setVisible(true);
    await session.receive({ type: 'ready' });

    expect(ports.post).not.toHaveBeenCalled();
  });

  it('GIVEN a hidden panel whose root has loaded WHEN ready arrives THEN nothing is posted', async () => {
    session.start();
    await session.receive({ type: 'ready' });

    expect(ports.post).not.toHaveBeenCalled();
  });

  it('GIVEN a hidden panel whose root has loaded WHEN ready arrives before the show THEN the show posts one state', async () => {
    session.start();
    await session.receive({ type: 'ready' });
    session.setVisible(true);

    expect(postedPhasesOf(ports)).toStrictEqual(['loading']);
  });

  describe('GIVEN a shown panel whose root has loaded', () => {
    beforeEach(() => {
      session.setVisible(true);
      session.start();
    });

    it('WHEN its dry run lists states before ready THEN nothing is posted', async () => {
      dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN ready arrives THEN one state is posted, still loading', async () => {
      await session.receive({ type: 'ready' });

      expect(postedPhasesOf(ports)).toStrictEqual(['loading']);
    });

    it('WHEN ready arrives and the dry run then lists states THEN the ready state follows', async () => {
      await session.receive({ type: 'ready' });
      dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();

      expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'ready']);
    });

    it('WHEN ready arrives after the dry run listed states THEN the one state is built at send time', async () => {
      dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();
      await session.receive({ type: 'ready' });

      expect(postedPhasesOf(ports)).toStrictEqual(['ready']);
    });

    it('WHEN hidden and shown again THEN nothing is posted until the rebuilt page sends ready', async () => {
      await session.receive({ type: 'ready' });
      session.setVisible(false);
      session.setVisible(true);
      dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
      await flushSettles();

      expect(postedPhasesOf(ports)).toStrictEqual(['loading']);
    });

    it('WHEN hidden and the rebuilt page sends ready before the show THEN the show posts the state', async () => {
      await session.receive({ type: 'ready' });
      session.setVisible(false);
      await session.receive({ type: 'ready' });
      session.setVisible(true);

      expect(postedPhasesOf(ports)).toStrictEqual(['loading', 'loading']);
    });

    it('WHEN shown twice THEN its visibility is reported once', () => {
      session.setVisible(true);

      expect(ports.setPanelVisible).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('WHEN a task of this package starts running before ready THEN nothing is posted', () => {
      runStore.tryStart(RUN_A_BUILD, 1000);

      expect(ports.post).not.toHaveBeenCalled();
    });

    describe('WHEN ready', () => {
      beforeEach(async () => {
        await session.receive({ type: 'ready' });
      });

      it('WHEN a task of this package starts running THEN its run state is posted', () => {
        runStore.tryStart(RUN_A_BUILD, 1000);

        const [last] = postedOf(ports).slice(-1);

        expect(last).toMatchObject({ type: 'runState', taskId: 'a#build', run: RUNNING });
      });

      it('WHEN a task of another package starts running THEN nothing is posted', () => {
        runStore.tryStart(RUN_WEB_BUILD, 1000);

        expect(postedOf(ports)).toHaveLength(1);
      });

      it('WHEN a package of the same name starts a task in another root THEN nothing is posted', () => {
        runStore.tryStart(RUN_OTHER_ROOT_A_BUILD, 1000);

        expect(postedOf(ports)).toHaveLength(1);
      });

      it('WHEN another root gets a new model THEN nothing is posted and no dry run starts', () => {
        store.apply('/other', OTHER_LOADED);

        expect(postedOf(ports)).toHaveLength(1);
        expect(ports.dryRun).toHaveBeenCalledOnce();
      });

      it('WHEN hidden and a task of this package starts running THEN nothing is posted', () => {
        session.setVisible(false);
        runStore.tryStart(RUN_A_BUILD, 1000);

        expect(postedOf(ports)).toHaveLength(1);
      });
    });

    describe('WHEN disposed while its dry run is in flight', () => {
      beforeEach(async () => {
        await session.receive({ type: 'ready' });
        session.dispose();
      });

      it('THEN the dry run is aborted', () => {
        expect(dryRunAt(dryRuns, 0).signal.aborted).toBe(true);
      });

      it('THEN its rejection posts nothing and is never unhandled', async () => {
        const unhandled = vi.fn();

        process.on('unhandledRejection', unhandled);
        dryRunAt(dryRuns, 0).reject(ABORTED);
        await flushSettles();
        process.off('unhandledRejection', unhandled);

        expect(unhandled).not.toHaveBeenCalled();
        expect(postedOf(ports)).toHaveLength(1);
      });

      it('THEN a late result, a run change and a model change post nothing', async () => {
        dryRunAt(dryRuns, 0).resolve([DRY_RUN_STATE_STUB]);
        runStore.tryStart(RUN_A_BUILD, 1000);
        store.apply('/ws', RELOADED_WITHOUT_BUILD);
        await flushSettles();

        expect(postedOf(ports)).toHaveLength(1);
        expect(ports.dryRun).toHaveBeenCalledOnce();
      });

      it('THEN its hidden visibility is reported once, also when disposed again', () => {
        session.dispose();

        expect(vi.mocked(ports.setPanelVisible).mock.calls).toStrictEqual([[true], [false]]);
      });
    });
  });

  it('GIVEN a panel never shown WHEN disposed THEN no visibility is reported', () => {
    session.dispose();

    expect(ports.setPanelVisible).not.toHaveBeenCalled();
  });
});
