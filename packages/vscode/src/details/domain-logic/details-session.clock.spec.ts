import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { DetailsState, HostMessage, RunStateMessage, RunView, TaskCard } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it } from 'vitest';

import { DetailsSession } from './details-session.ts';
import type { LoadedModel } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import type { RunDefinition, RunRequest } from '../../run/common/run.type.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { RUN_REQUEST_STUB } from '../../run/test/stubs/run.stub.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { DetailsPorts } from '../common/details.type.ts';
import { detailsPortsMock } from '../test/mocks/details-ports.mock.ts';
import {
  A_PACKAGE_STUB,
  BUILD_TASK_STUB,
  DETAILS_LOADED_STUB,
  DETAILS_MODEL_STUB,
  PANEL_KEY_STUB
} from '../test/stubs/details-model.stub.ts';
import { postedOf, postedStatesOf } from '../test/utils/deferred-dry-runs.spec.util.ts';

const NOW = 1_000_000;

const LAUNCHED_AT = NOW - 12_345;

const RUN_A_BUILD: RunRequest = { ...RUN_REQUEST_STUB, task: BUILD_TASK_STUB };

const A_BUILD: RunDefinition = { root: '/ws', id: 'a#build' };

const continuousIfBuild = (task: TaskNode): TaskNode => {
  const continuous: TaskNode = { ...task, persistent: true };

  return task.id === BUILD_TASK_STUB.id ? continuous : task;
};

/** The loaded root after a config edit made `a#build` continuous; the run keeps the one-shot node it launched with. */
const continuousBuildLoaded = (): LoadedModel => {
  const tasks = A_PACKAGE_STUB.tasks.map(continuousIfBuild);
  const pkg: PackageNode = { ...A_PACKAGE_STUB, tasks };
  const model: WorkspaceModel = { ...DETAILS_MODEL_STUB, packages: [pkg] };
  const loaded: LoadedModel = { ...DETAILS_LOADED_STUB, model };

  return loaded;
};

const isRunState = (message: HostMessage): message is RunStateMessage => message.type === 'runState';

const lastRunViewOf = (ports: DetailsPorts): RunView | undefined => {
  const runStates = postedOf(ports).filter(isRunState);

  return runStates.at(-1)?.run;
};

const NO_CARDS: TaskCard[] = [];

const cardsOf = (state: DetailsState): TaskCard[] => (state.kind === 'package' ? state.tasks : NO_CARDS);

const isBuildCard = (card: TaskCard): boolean => card.taskId === 'a#build';

/** The `a#build` run views of every posted state, in order. */
const buildRunsOf = (ports: DetailsPorts): RunView[] => {
  const cards = postedStatesOf(ports).flatMap(cardsOf);

  return cards.filter(isBuildCard).map((card) => card.run);
};

describe('FEATURE: details session clock and live kind', () => {
  let store: RootStore;
  let runStore: RunStore;
  let ports: DetailsPorts;
  let session: DetailsSession;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
    store.apply('/ws', DETAILS_LOADED_STUB);
    runStore = new RunStore();
    const portsMock = detailsPortsMock();

    ports = { ...portsMock, now: (): number => NOW };
    session = new DetailsSession(PANEL_KEY_STUB, store, runStore, ports);
    session.setVisible(true);
    session.start();
  });

  describe('GIVEN a build launched 12 345 ms before the port clock reading', () => {
    it('WHEN it starts on a ready page THEN the posted run state counts from the port clock', async () => {
      await session.receive({ type: 'ready' });

      runStore.tryStart(RUN_A_BUILD, LAUNCHED_AT);

      expect(lastRunViewOf(ports)?.elapsedMs).toBe(12_345);
    });

    it('WHEN the page sends ready after the start THEN the posted state counts from the port clock', async () => {
      runStore.tryStart(RUN_A_BUILD, LAUNCHED_AT);

      await session.receive({ type: 'ready' });

      expect(buildRunsOf(ports).at(-1)?.elapsedMs).toBe(12_345);
    });
  });

  describe('GIVEN a running one-shot build whose config then made it continuous', () => {
    it('WHEN its run changes THEN the posted run state reads the current model node', async () => {
      await session.receive({ type: 'ready' });
      runStore.tryStart(RUN_A_BUILD, LAUNCHED_AT);
      store.apply('/ws', continuousBuildLoaded());

      runStore.processStarted(A_BUILD, NOW, LAUNCHED_AT);

      const run = lastRunViewOf(ports);

      expect([run?.iconId, run?.text]).toStrictEqual(['pulse', 'continuous']);
    });
  });
});
