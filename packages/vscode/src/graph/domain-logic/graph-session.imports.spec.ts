import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { RunStore } from '../../run/domain-logic/run-store.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { GRAPH_LOADED_STUB } from '../test/stubs/graph-model.stub.ts';
import { feedsOf } from '../test/utils/graph-feeds.spec.util.ts';
import { portsWith, postedOf } from '../test/utils/graph-session.spec.util.ts';
import { importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';
import { pendingScanOf, scanInputsOf } from '../test/utils/import-scans.spec.util.ts';

type ShownSession = {
  readonly session: GraphSession;
  readonly ports: GraphPorts;
};

const loadedStore = (): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());
  store.apply('/ws', GRAPH_LOADED_STUB);

  return store;
};

/** A started, shown session on `/ws` over the stub graph. */
const shownSession = (): ShownSession => {
  const ports = portsWith(null);
  const session = new GraphSession('/ws', loadedStore(), ports, feedsOf(new RunStore()));

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, ports };

  return shown;
};

const FOUND_ONE = { kind: 'found', total: 1 };

const edgeImportsOf = (ports: GraphPorts): unknown[] => postedOf(ports).filter((message) => message.type === 'edgeImports');

describe('FEATURE: graph session import requests (spec D10, D12)', () => {
  describe('GIVEN a scanImports request', () => {
    it('WHEN web → a arrives after ready THEN apps/web is scanned once and an edgeImports for web → a is posted last', async () => {
      const { session, ports } = shownSession();

      vi.mocked(ports.scanImports).mockResolvedValue(importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a', 2)])]));
      await session.receive({ type: 'ready' });
      await session.receive({ type: 'scanImports', source: 'web', target: 'a' });

      expect(scanInputsOf(ports).map((input) => input.dir)).toStrictEqual([join('/ws', 'apps/web')]);
      expect(postedOf(ports).at(-1)).toMatchObject({ type: 'edgeImports', source: 'web', target: 'a', result: FOUND_ONE });
    });

    it('WHEN it names an unlisted edge THEN nothing is scanned and the drop is logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'scanImports', source: 'a', target: 'web' });

      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN it has no target THEN nothing is scanned and the drop is logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive(JSON.parse('{"type":"scanImports","source":"web"}'));

      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN a scan is pending and explainEdge web → a arrives THEN its edgeExplained is posted before the scan settles', async () => {
      const { session, ports } = shownSession();
      const pending = pendingScanOf(ports);

      await session.receive({ type: 'ready' });

      const scanning = session.receive({ type: 'scanImports', source: 'web', target: 'a' });

      await vi.waitFor(() => {
        expect(ports.scanImports).toHaveBeenCalledTimes(1);
      });
      await session.receive({ type: 'explainEdge', source: 'web', target: 'a' });

      expect(postedOf(ports).at(-1)).toMatchObject({ type: 'edgeExplained', source: 'web', target: 'a' });
      expect(edgeImportsOf(ports)).toHaveLength(0);

      pending.resolve(importScanOf([]));
      await scanning;

      expect(edgeImportsOf(ports)).toHaveLength(1);
    });

    it('WHEN the panel is disposed while a scan is pending THEN its signal is aborted and no edgeImports is posted', async () => {
      const { session, ports } = shownSession();
      const pending = pendingScanOf(ports);

      await session.receive({ type: 'ready' });

      const scanning = session.receive({ type: 'scanImports', source: 'web', target: 'a' });

      await vi.waitFor(() => {
        expect(ports.scanImports).toHaveBeenCalledTimes(1);
      });
      session.dispose();

      const [input] = scanInputsOf(ports);

      pending.resolve(importScanOf([]));
      await scanning;

      expect(input?.signal.aborted).toBe(true);
      expect(edgeImportsOf(ports)).toHaveLength(0);
    });
  });

  describe('GIVEN an openImport request', () => {
    it("WHEN web src/x.ts line 4 arrives and the read gives text THEN join('/ws', 'apps/web', 'src/x.ts') opens at 4", async () => {
      const { session, ports } = shownSession();
      const file = join('/ws', 'apps/web', 'src/x.ts');

      vi.mocked(ports.readText).mockResolvedValue('import "a";');
      await session.receive({ type: 'ready' });
      await session.receive({ type: 'openImport', packageName: 'web', file: 'src/x.ts', line: 4 });

      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(file, 4);
    });

    it("WHEN it names '../a/x.ts' THEN nothing is read and the drop is logged", async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'openImport', packageName: 'web', file: '../a/x.ts', line: 4 });

      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN the read gives null THEN nothing opens, the path is logged and no drop is logged', async () => {
      const { session, ports } = shownSession();
      const file = join('/ws', 'apps/web', 'src/x.ts');

      await session.receive({ type: 'ready' });
      await session.receive({ type: 'openImport', packageName: 'web', file: 'src/x.ts', line: 4 });

      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(file));
    });
  });
});
