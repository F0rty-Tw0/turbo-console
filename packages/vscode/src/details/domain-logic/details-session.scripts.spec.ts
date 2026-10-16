import type { TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsSession } from './details-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunDefinition, RunRequest } from '../../run/common/run.type.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUN_REQUEST_STUB } from '../../run/test/stubs/run.stub.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import {
  ADHOC_TASK_STUB,
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_LOADED_STUB,
  DETAILS_MODEL_STUB,
  PANEL_KEY_STUB,
  WEB_BUILD_TASK_STUB,
  WEB_PACKAGE_STUB
} from '../test/stubs/details-model.stub.ts';
import { deferDryRuns, postedOf, postedStatesOf } from '../test/utils/deferred-dry-runs.spec.util.ts';

const WEB_SCRIPT: TaskNode = { ...ADHOC_TASK_STUB, id: 'web#adhoc' };
const SCRIPT_PACKAGE = { ...A_PACKAGE_STUB, tasks: [BUILD_TASK_STUB, ADHOC_TASK_STUB] };
const WEB_WITH_SCRIPT = { ...WEB_PACKAGE_STUB, tasks: [WEB_BUILD_TASK_STUB, WEB_SCRIPT] };
const SCRIPT_MODEL = { ...DETAILS_MODEL_STUB, packages: [SCRIPT_PACKAGE, WEB_WITH_SCRIPT] };
const WITH_SCRIPT = { ...DETAILS_LOADED_STUB, model: SCRIPT_MODEL };
const MODEL_WITHOUT_SCRIPT = { ...SCRIPT_MODEL, packages: [A_PACKAGE_STUB, WEB_WITH_SCRIPT] };
const WITHOUT_SCRIPT = { ...DETAILS_LOADED_STUB, model: MODEL_WITHOUT_SCRIPT };
const RUN_SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, task: ADHOC_TASK_STUB };
const RUN_WEB_SCRIPT: RunRequest = { ...RUN_REQUEST_STUB, packageName: 'web', task: WEB_SCRIPT };
const RUN_TURBO: RunRequest = { ...RUN_REQUEST_STUB, task: BUILD_TASK_STUB };
const SCRIPT: RunDefinition = { root: '/ws', id: 'a#adhoc' };

describe('FEATURE: details session with scripts hidden', () => {
  let store: RootStore;
  let runStore: RunStore;
  let ports: DetailsPorts;
  let session: DetailsSession;

  const postedTypes = (): string[] => postedOf(ports).map((message) => message.type);

  const lastCardIds = (): string[] => {
    const [last] = postedStatesOf(ports).slice(-1);

    if (last?.kind !== 'package') throw new Error('no package state was posted');

    return last.tasks.map((card) => card.taskId);
  };

  const showReady = async (): Promise<void> => {
    session.setVisible(true);
    await session.receive({ type: 'ready' });
  };

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    store.apply('/ws', WITH_SCRIPT);
    runStore = new RunStore();
    ports = detailsPortsMock();
    deferDryRuns(ports);
    vi.mocked(ports.scriptsShown).mockReturnValue(false);
    session = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);
    session.start();
  });

  describe('GIVEN a ready panel', () => {
    beforeEach(showReady);

    it('WHEN a script of the package starts THEN a full state with its card is posted', () => {
      runStore.tryStart(RUN_SCRIPT, 1000);

      expect(postedTypes()).toStrictEqual(['state', 'state']);
      expect(lastCardIds()).toStrictEqual(['a#adhoc', 'a#build']);
    });

    it('WHEN that script ends THEN a full state without its card is posted', () => {
      runStore.tryStart(RUN_SCRIPT, 1000);
      runStore.processEnded(SCRIPT, 0, 2000);

      expect(postedTypes()).toStrictEqual(['state', 'state', 'state']);
      expect(lastCardIds()).toStrictEqual(['a#build']);
    });

    it('WHEN its process starts THEN only a run state is posted', () => {
      runStore.tryStart(RUN_SCRIPT, 1000);
      runStore.processStarted(SCRIPT, 1100);

      expect(postedTypes()).toStrictEqual(['state', 'state', 'runState']);
    });

    it('WHEN Stop is requested on it THEN only a run state is posted', () => {
      runStore.tryStart(RUN_SCRIPT, 1000);
      runStore.requestStop(SCRIPT);

      expect(postedTypes()).toStrictEqual(['state', 'state', 'runState']);
    });

    it('WHEN a turbo task of the package starts and ends THEN only run states are posted', () => {
      runStore.tryStart(RUN_TURBO, 1000);
      runStore.processEnded({ root: '/ws', id: 'a#build' }, 0, 2000);

      expect(postedTypes()).toStrictEqual(['state', 'runState', 'runState']);
    });

    it('WHEN a script of another package starts THEN nothing is posted', () => {
      runStore.tryStart(RUN_WEB_SCRIPT, 1000);

      expect(postedTypes()).toStrictEqual(['state']);
    });

    it('WHEN the script runs and a reload drops its task and then the run ends THEN only a run state is posted', () => {
      runStore.tryStart(RUN_SCRIPT, 1000);
      store.apply('/ws', WITHOUT_SCRIPT);
      runStore.processEnded(SCRIPT, 0, 2000);

      expect(postedTypes().slice(-1)).toStrictEqual(['runState']);
    });
  });

  describe('GIVEN a panel that was hidden while a script started', () => {
    beforeEach(async () => {
      await showReady();
      session.setVisible(false);
      runStore.tryStart(RUN_SCRIPT, 1000);
      session.setVisible(true);
      await session.receive({ type: 'ready' });
    });

    it('WHEN shown THEN the state holds the live card', () => {
      expect(lastCardIds()).toStrictEqual(['a#adhoc', 'a#build']);
    });

    it('WHEN the run then ends THEN a full state without the card is posted', () => {
      runStore.processEnded(SCRIPT, 0, 2000);

      expect(postedTypes().slice(-1)).toStrictEqual(['state']);
      expect(lastCardIds()).toStrictEqual(['a#build']);
    });
  });

  describe('GIVEN a script already running when the panel starts', () => {
    it('WHEN the run ends THEN a full state without the card is posted', async () => {
      runStore.tryStart(RUN_SCRIPT, 1000);
      const late = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);

      late.start();
      late.setVisible(true);
      await late.receive({ type: 'ready' });
      runStore.processEnded(SCRIPT, 0, 2000);

      expect(postedTypes().slice(-1)).toStrictEqual(['state']);
      expect(lastCardIds()).toStrictEqual(['a#build']);
    });
  });
});

describe('FEATURE: details session with scripts shown', () => {
  it('GIVEN a ready panel WHEN a script starts and ends THEN only run states are posted', async () => {
    const store = new RootStore();
    const ports = detailsPortsMock();
    const runStore = new RunStore();

    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    store.apply('/ws', WITH_SCRIPT);
    deferDryRuns(ports);
    const session = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);

    session.start();
    session.setVisible(true);
    await session.receive({ type: 'ready' });
    runStore.tryStart(RUN_SCRIPT, 1000);
    runStore.processEnded(SCRIPT, 0, 2000);

    expect(postedOf(ports).map((message) => message.type)).toStrictEqual(['state', 'runState', 'runState']);
  });
});
