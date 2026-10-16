import type { HostMessage, StateMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import type { ScriptsToggleFake } from '../../shared/test/common/scripts-toggle-fake.type.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock } from '../test/mocks/panel-host.mock.ts';
import { ADHOC_TASK_STUB, A_PACKAGE_STUB, DETAILS_LOADED_STUB, DETAILS_MODEL_STUB } from '../test/stubs/details-model.stub.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const WS_WEB: PanelKey = { root: '/ws', packageName: 'web' };
const READY = { type: 'ready' };
const WITH_SCRIPT_PACKAGE = { ...A_PACKAGE_STUB, tasks: [...A_PACKAGE_STUB.tasks, ADHOC_TASK_STUB] };
const WEB_ONLY = DETAILS_MODEL_STUB.packages.slice(1);
const WITH_SCRIPT_MODEL = { ...DETAILS_MODEL_STUB, packages: [WITH_SCRIPT_PACKAGE, ...WEB_ONLY] };
const WITH_SCRIPT = { ...DETAILS_LOADED_STUB, model: WITH_SCRIPT_MODEL };

const isState = (message: HostMessage): message is StateMessage => message.type === 'state';

describe('FEATURE: details panels follow the scripts toggle', () => {
  let fakes: HostFakes;
  let scripts: ScriptsToggleFake;
  let panels: DetailsPanels;

  const statesOf = (packageName: string): StateMessage[] => {
    const posted = panels.api().posted('/ws', packageName);

    return posted.filter(isState);
  };

  const cardIdsOf = (packageName: string): string[] => {
    const last = statesOf(packageName).at(-1);

    if (last?.state.kind !== 'package') throw new Error('no package state was posted');

    return last.state.tasks.map((card) => card.taskId);
  };

  beforeEach(async () => {
    const store = new RootStore();

    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', WITH_SCRIPT);
    fakes = hostMock();
    scripts = scriptsToggleMock(false);
    panels = new DetailsPanels({ roots: store, runs: new RunStore(), scripts, host: fakes.host, setPanelVisible: vi.fn() });
    await panels.open(WS_A);
    await panels.open(WS_WEB);
    await panels.api().receive('/ws', 'a', READY);
    await panels.api().receive('/ws', 'web', READY);
  });

  describe('GIVEN two open ready panels', () => {
    it('WHEN the toggle changes THEN each panel posts one more state', async () => {
      await scripts.set(true);

      expect(statesOf('a')).toHaveLength(2);
      expect(statesOf('web')).toHaveLength(2);
    });

    it('WHEN the toggle shows scripts THEN the fresh state holds the script card', async () => {
      await scripts.set(true);

      expect(cardIdsOf('a')).toContain('a#adhoc');
    });

    it('WHEN the toggle goes back THEN the script card is gone', async () => {
      await scripts.set(true);
      await scripts.set(false);

      expect(cardIdsOf('a')).not.toContain('a#adhoc');
    });

    it('WHEN refreshAll is called THEN each panel posts one more state', () => {
      panels.refreshAll();

      expect(statesOf('a')).toHaveLength(2);
      expect(statesOf('web')).toHaveLength(2);
    });
  });

  describe('GIVEN a hidden panel', () => {
    it('WHEN the toggle changes THEN it posts nothing', async () => {
      fakes.views[0]?.show(false);

      await scripts.set(true);

      expect(statesOf('a')).toHaveLength(1);
    });
  });

  describe('GIVEN disposed panels', () => {
    it('WHEN the toggle changes THEN no listener is left', async () => {
      panels.dispose();

      await scripts.set(true);

      expect(scripts.listeners.size).toBe(0);
    });
  });
});
