import { describe, expect, it, vi } from 'vitest';

import { panelPortsOf } from './panel-ports.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { viewMock } from '../../shared/test/mocks/panel-view.mock.ts';
import { scriptsToggleMock } from '../../shared/test/mocks/scripts-toggle.mock.ts';
import type { PanelKey } from '../common/details.type.ts';
import type { PanelParts, PanelsDeps } from '../common/panel.type.ts';
import { hostMock } from '../test/mocks/panel-host.mock.ts';

const KEY: PanelKey = { root: '/ws', packageName: 'a' };

const PARTS: PanelParts = { key: KEY, id: 'panel-1', posted: [] };

const depsWith = (scripts = scriptsToggleMock()): PanelsDeps => {
  const deps: PanelsDeps = { roots: new RootStore(), runs: new RunStore(), scripts, host: hostMock().host, setPanelVisible: vi.fn() };

  return deps;
};

describe('FEATURE: details panel ports', () => {
  describe('GIVEN the ports of one panel', () => {
    it('WHEN the clock is read THEN it is the wall clock, the base of every run launch time', () => {
      const ports = panelPortsOf(depsWith(), PARTS, viewMock().view);

      const drift = Math.abs(ports.now() - Date.now());

      expect(drift).toBeLessThan(1000);
    });

    it('WHEN scripts shown is read THEN it is the toggle value now, not the one at creation', async () => {
      const scripts = scriptsToggleMock(false);
      const ports = panelPortsOf(depsWith(scripts), PARTS, viewMock().view);

      await scripts.set(true);

      expect(ports.scriptsShown()).toBe(true);
    });
  });
});
