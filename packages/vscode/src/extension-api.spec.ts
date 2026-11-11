import type { HostMessage } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiOf } from './extension-api.ts';
import type { ProgressRecords } from './run/common/run-progress.type.ts';
import { RunStore } from './run/domain-logic/run-store.ts';
import type { DetailsApi, GraphApi, PanelInfo, TickerApi, TurboConsoleApi } from './shared/common/api.type.ts';
import type { FixedItem } from './tree/common/fixed-view.type.ts';
import { packagesTreeApiMock } from './tree/test/mocks/packages-tree-api.mock.ts';
import { TIMINGS_STUB } from './tree/test/stubs/timings.stub.ts';

describe('FEATURE: the extension API', () => {
  let whenIdle: TurboConsoleApi['whenIdle'];
  let details: DetailsApi;
  let api: TurboConsoleApi;

  beforeEach(() => {
    const fixedView = { getChildren: vi.fn((): FixedItem[] => []) };
    const graphApi: GraphApi = { panels: () => [], posted: () => [], receive: vi.fn(), cachedHash: () => null };
    const session = { loads: new Map(), whenIdle: vi.fn<TurboConsoleApi['whenIdle']>() };
    const progress: ProgressRecords = { recordsOf: () => [] };
    const runSession = { runs: new RunStore(), progress };
    const visibility = { read: (): boolean => true, description: (): string => 'Affected: tasks' };
    const tickerApi = { ticks: (): number => 0 };
    const ticker = { api: (): TickerApi => tickerApi };
    const panels = { api: (): DetailsApi => details };
    const graph = { api: graphApi };

    whenIdle = session.whenIdle;
    details = { panels: (): PanelInfo[] => [], posted: (): HostMessage[] => [], receive: vi.fn(), whenIdle: vi.fn() };
    api = apiOf({
      tree: packagesTreeApiMock(),
      commands: fixedView,
      help: fixedView,
      timings: TIMINGS_STUB,
      session,
      runSession,
      panels,
      graph,
      visibility,
      ticker
    });
  });

  describe('GIVEN an API over the live parts of the extension', () => {
    it('WHEN whenIdle is awaited for a root THEN the session waits on that root', async () => {
      await api.whenIdle('/ws');

      expect(whenIdle).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it('WHEN the tree description is read THEN it is the bound view description', () => {
      const description = api.treeDescription();

      expect(description).toBe('Affected: tasks');
    });

    it('WHEN the details API is read THEN it is the one the panels hand out', () => {
      expect(api.details).toBe(details);
    });
  });
});
