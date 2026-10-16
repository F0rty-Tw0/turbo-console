import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { DetailsPanels } from './details-panels.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { PanelsDeps } from '../common/panel.type.ts';
import type { HostFakes } from '../test/common/panel-fakes.type.ts';
import { hostMock, viewMock } from '../test/mocks/panel-host.mock.ts';
import { DETAILS_LOADED_STUB } from '../test/stubs/details-model.stub.ts';
import { statesPostedOf } from '../test/utils/panels-setup.spec.util.ts';

const WS_A: PanelKey = { root: '/ws', packageName: 'a' };
const READY = { type: 'ready' };

describe('FEATURE: details panel visibility', () => {
  let store: RootStore;
  let fakes: HostFakes;
  let setPanelVisible: Mock<PanelsDeps['setPanelVisible']>;
  let panels: DetailsPanels;

  beforeEach(() => {
    store = new RootStore();
    store.set([ROOT_FOLDER_STUB], coordinatorMock);
    store.apply('/ws', DETAILS_LOADED_STUB);
    fakes = hostMock();
    setPanelVisible = vi.fn<PanelsDeps['setPanelVisible']>();
    panels = new DetailsPanels({
      roots: store,
      runs: new RunStore(),
      scripts: scriptsToggleMock(),
      host: fakes.host,
      setPanelVisible
    });
  });

  describe('GIVEN the visibility reported to the root session', () => {
    it('WHEN a panel is created shown THEN it reports shown once and no more', async () => {
      await panels.open(WS_A);

      expect(setPanelVisible).toHaveBeenCalledOnce();
    });

    it('WHEN a panel is created hidden THEN it reports nothing', async () => {
      fakes.queue(viewMock(false));

      await panels.open(WS_A);

      expect(setPanelVisible).not.toHaveBeenCalled();
    });

    it('WHEN the view hides and the tab then closes THEN hidden is reported exactly once in total', async () => {
      await panels.open(WS_A);

      fakes.views[0]?.show(false);
      fakes.views[0]?.close();

      const reports = setPanelVisible.mock.calls.map((call) => call[2]);

      expect(reports).toStrictEqual([true, false]);
    });
  });

  describe('GIVEN a panel created hidden', () => {
    beforeEach(async () => {
      fakes.queue(viewMock(false));
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');
    });

    it('WHEN it is shown and the page posts ready THEN the state is posted', async () => {
      fakes.views[0]?.show(true);
      fakes.views[0]?.message(READY);

      await vi.waitFor(() => {
        expect(statesPostedOf(panels.api())).toBeGreaterThan(0);
      });
    });
  });

  describe('GIVEN a shown panel that posted its state', () => {
    beforeEach(async () => {
      await panels.open(WS_A);
      await panels.api().whenIdle('/ws', 'a');
      fakes.views[0]?.message(READY);
      await vi.waitFor(() => {
        const posted = statesPostedOf(panels.api());

        if (posted !== 1) throw new Error('the state is not posted yet');
      });
    });

    it('WHEN it hides and the root changes THEN nothing more is posted', async () => {
      fakes.views[0]?.show(false);

      store.apply('/ws', DETAILS_LOADED_STUB);
      await panels.api().whenIdle('/ws', 'a');

      expect(statesPostedOf(panels.api())).toBe(1);
    });
  });
});
