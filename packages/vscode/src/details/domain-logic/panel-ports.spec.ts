import { describe, expect, it, vi } from 'vitest';

import { panelPortsOf } from './panel-ports.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { PanelParts, PanelsDeps } from '../common/panel.type.ts';
import { hostMock, viewMock } from '../test/mocks/panel-host.mock.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

const PARTS: PanelParts = { key: KEY, id: 'panel-1', posted: [] };

describe('FEATURE: details panel ports', () => {
  describe('GIVEN the ports of one panel', () => {
    it('WHEN the clock is read THEN it is the wall clock, the base of every run launch time', () => {
      const deps: PanelsDeps = { roots: new RootStore(), runs: new RunStore(), host: hostMock().host, setPanelVisible: vi.fn() };
      const ports = panelPortsOf(deps, PARTS, viewMock().view);

      const drift = Math.abs(ports.now() - Date.now());

      expect(drift).toBeLessThan(1000);
    });
  });
});
