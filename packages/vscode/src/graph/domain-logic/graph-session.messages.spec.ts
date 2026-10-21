import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { GraphSession } from './graph-session.ts';
import type { LoadedModel } from '../../roots/common/root.type.ts';
import { RootStore } from '../../roots/domain-logic/root-store.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_FOLDER_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import {
  GRAPH_HASH_STUB,
  GRAPH_LOADED_STUB,
  GRAPH_PACKAGES_STUB,
  GROWN_LOADED_STUB,
  PROTO_LOADED_STUB
} from '../test/stubs/graph-model.stub.ts';
import { lastStateOf, portsWith, positionsOf, postedOf } from '../test/utils/graph-session.spec.util.ts';

type ShownSession = {
  readonly session: GraphSession;
  readonly store: RootStore;
  readonly ports: GraphPorts;
};

const emptyStore = (): RootStore => {
  const store = new RootStore();

  store.set([ROOT_FOLDER_STUB], () => coordinatorMock());

  return store;
};

const loadedStore = (loaded: LoadedModel = GRAPH_LOADED_STUB): RootStore => {
  const store = emptyStore();

  store.apply('/ws', loaded);

  return store;
};

/** The JSON a page posts: a `__proto__` key in it is an own key once parsed, as the webview channel delivers it. */
const overTheWire = (message: unknown): unknown => JSON.parse(JSON.stringify(message));

const cachedPositionsOf = (ports: GraphPorts): unknown => vi.mocked(ports.writeCache).mock.calls[0]?.[1].positions;

/** A started, shown session on `/ws`; `cached` seeds its layout cache. */
const shownSession = (cached: GraphLayoutCacheEntry | null = null, store: RootStore = loadedStore()): ShownSession => {
  const ports = portsWith(cached);
  const session = new GraphSession('/ws', store, ports);

  session.setVisible(true);
  session.start();

  const shown: ShownSession = { session, store, ports };

  return shown;
};

describe('FEATURE: graph session messages', () => {
  describe('GIVEN positions from the page', () => {
    it('WHEN they carry the hash of the first state after a model change THEN nothing is stored and the drop is logged', async () => {
      const { session, store, ports } = shownSession();

      await session.receive({ type: 'ready' });
      const first = lastStateOf(ports);

      store.apply('/ws', GROWN_LOADED_STUB);

      await session.receive({ type: 'positions', hash: first.hash, positions: positionsOf(first.packages) });

      expect(ports.writeCache).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN they carry the current hash and every package THEN they are stored once under the root', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'ready' });
      const positions = positionsOf(GRAPH_PACKAGES_STUB);

      await session.receive({ type: 'positions', hash: GRAPH_HASH_STUB, positions });

      expect(ports.writeCache).toHaveBeenCalledExactlyOnceWith('/ws', { hash: GRAPH_HASH_STUB, positions });
    });

    it('WHEN one package is missing THEN they are dropped and logged', async () => {
      const { session, ports } = shownSession();
      const positions = positionsOf(['@org/x', 'a']);

      await session.receive({ type: 'positions', hash: GRAPH_HASH_STUB, positions });

      expect(ports.writeCache).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN the record is past 5000 keys THEN only its size is logged', async () => {
      const { session, ports } = shownSession();
      const names = Array.from({ length: 5001 }, (_, index) => `p${index}`);

      await session.receive({ type: 'positions', hash: GRAPH_HASH_STUB, positions: positionsOf(names) });

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Dropped a graph message: positions with 5001 keys');
    });

    it('WHEN a package is named __proto__ and the posted JSON names it THEN the positions are cached with it as an own key', async () => {
      const { session, ports } = shownSession(null, loadedStore(PROTO_LOADED_STUB));

      await session.receive({ type: 'ready' });

      const { hash, packages } = lastStateOf(ports);
      const message = overTheWire({ type: 'positions', hash, positions: positionsOf(packages) });

      await session.receive(message);

      expect(Object.hasOwn(cachedPositionsOf(ports) ?? {}, '__proto__')).toBe(true);
    });

    it('WHEN a package is named __proto__ and its positions are cached THEN Object.prototype is untouched', async () => {
      const { session, ports } = shownSession(null, loadedStore(PROTO_LOADED_STUB));

      await session.receive({ type: 'ready' });

      const { hash, packages } = lastStateOf(ports);

      await session.receive(overTheWire({ type: 'positions', hash, positions: positionsOf(packages) }));

      expect(Object.hasOwn(Object.prototype, 'x')).toBe(false);
      expect(Object.getPrototypeOf(cachedPositionsOf(ports))).toBe(Object.prototype);
    });

    it('WHEN one name is not a package THEN they are dropped and logged', async () => {
      const { session, ports } = shownSession();
      const positions = positionsOf([...GRAPH_PACKAGES_STUB, 'ghost']);

      await session.receive({ type: 'positions', hash: GRAPH_HASH_STUB, positions });

      expect(ports.writeCache).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });
  });

  describe('GIVEN an openDetails from the page', () => {
    it('WHEN it names a package of the graph THEN Details opens for it', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'openDetails', packageName: 'web' });

      expect(ports.openDetails).toHaveBeenCalledExactlyOnceWith('web');
    });

    it('WHEN it names a package that is not in the graph THEN no Details opens and the drop is logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'openDetails', packageName: 'ghost' });

      expect(ports.openDetails).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledOnce();
    });

    it('WHEN opening Details rejects THEN the failure is logged and receive resolves', async () => {
      const { session, ports } = shownSession();

      vi.mocked(ports.openDetails).mockRejectedValue(new Error('no panel'));

      await session.receive({ type: 'openDetails', packageName: 'web' });

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('no panel');
    });
  });

  describe('GIVEN an explainEdge from the page', () => {
    it('WHEN it names an edge of the graph THEN an edgeExplained for it is posted last', async () => {
      const { session, ports } = shownSession();

      vi.mocked(ports.readText).mockResolvedValue('{"dependencies":{"a":"1"}}');
      await session.receive({ type: 'ready' });
      await session.receive({ type: 'explainEdge', source: 'web', target: 'a' });

      const last = postedOf(ports).at(-1);

      const result = { kind: 'found' };

      expect(last).toMatchObject({ type: 'edgeExplained', source: 'web', target: 'a', result });
    });

    it('WHEN it names a package that is not listed THEN nothing is read and the drop is logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'explainEdge', source: 'ghost', target: 'a' });

      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });

    it('WHEN the panel is hidden before the read resolves THEN no edgeExplained is posted', async () => {
      const { session, ports } = shownSession();
      const read = Promise.withResolvers<string | null>();

      vi.mocked(ports.readText).mockReturnValue(read.promise);
      await session.receive({ type: 'ready' });

      const answered = session.receive({ type: 'explainEdge', source: 'web', target: 'a' });

      session.setVisible(false);
      read.resolve('{}');
      await answered;

      expect(postedOf(ports).filter((message) => message.type === 'edgeExplained')).toStrictEqual([]);
    });
  });

  describe('GIVEN an explainEdge whose read is still pending', () => {
    it('WHEN more explainEdge arrive THEN only the first and the last are read and the last reply is posted', async () => {
      const { session, ports } = shownSession();
      const read = Promise.withResolvers<string | null>();

      vi.mocked(ports.readText).mockReturnValueOnce(read.promise).mockResolvedValue('{"dependencies":{"@org/x":"1"}}');
      await session.receive({ type: 'ready' });

      const first = session.receive({ type: 'explainEdge', source: 'web', target: 'a' });
      const second = session.receive({ type: 'explainEdge', source: 'web', target: '@org/x' });
      const last = session.receive({ type: 'explainEdge', source: 'a', target: '@org/x' });

      await Promise.all([second, last]);

      expect(ports.readText).toHaveBeenCalledTimes(1);

      read.resolve('{}');
      await first;

      const explained = postedOf(ports).filter((message) => message.type === 'edgeExplained');

      expect(ports.readText).toHaveBeenCalledTimes(2);
      expect(ports.readText).toHaveBeenLastCalledWith(join('/ws', 'packages/a', 'package.json'));
      expect(explained).toHaveLength(2);
      expect(explained.at(-1)).toMatchObject({ type: 'edgeExplained', source: 'a', target: '@org/x' });
    });

    it('WHEN an openManifest arrives THEN it opens without waiting for the read', async () => {
      const { session, ports } = shownSession();
      const read = Promise.withResolvers<string | null>();

      vi.mocked(ports.readText).mockReturnValue(read.promise);
      await session.receive({ type: 'ready' });

      const explained = session.receive({ type: 'explainEdge', source: 'web', target: 'a' });

      await session.receive({ type: 'openManifest', packageName: 'web', line: 3 });

      expect(ports.openAt).toHaveBeenCalledTimes(1);

      read.resolve('{}');
      await explained;
    });

    it('WHEN the panel is disposed before the read resolves THEN the pending request is not read', async () => {
      const { session, ports } = shownSession();
      const read = Promise.withResolvers<string | null>();

      vi.mocked(ports.readText).mockReturnValue(read.promise);
      await session.receive({ type: 'ready' });

      const first = session.receive({ type: 'explainEdge', source: 'web', target: 'a' });

      await session.receive({ type: 'explainEdge', source: 'a', target: '@org/x' });
      session.dispose();
      read.resolve('{}');
      await first;

      expect(ports.readText).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN an openManifest from the page', () => {
    it('WHEN it names a package of the graph THEN its package.json opens at the line', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'openManifest', packageName: 'web', line: 3 });

      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(join('/ws', 'apps/web', 'package.json'), 3);
    });

    it('WHEN it names a package that is not listed THEN nothing opens and the drop is logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'openManifest', packageName: 'ghost', line: 3 });

      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });
  });

  describe('GIVEN other messages from the page', () => {
    it('WHEN reload arrives while the graph shows THEN the root is not refreshed and the drop is logged', async () => {
      const { session, store, ports } = shownSession();

      await session.receive({ type: 'reload' });

      expect(store.get('/ws')?.coordinator.request).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('Dropped a graph message: {"type":"reload"}');
    });

    it('WHEN layoutDone arrives THEN one info line is logged, nothing is posted or cached', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'layoutDone', ms: 12, engine: 'elk' });

      expect(ports.info).toHaveBeenCalledExactlyOnceWith('graph layout elk 12 ms');
      expect(ports.log).not.toHaveBeenCalled();
      expect(ports.post).not.toHaveBeenCalled();
      expect(ports.writeCache).not.toHaveBeenCalled();
    });

    it('WHEN a message fails the schema THEN it is dropped and logged', async () => {
      const { session, ports } = shownSession();

      await session.receive({ type: 'positions' });

      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('Dropped a graph message'));
    });
  });

  describe('GIVEN a shown session on a root whose load failed', () => {
    it('WHEN reload arrives THEN the root coordinator is asked to refresh once', async () => {
      const { session, store } = shownSession(null, emptyStore());

      store.apply('/ws', LOAD_FAILURE_STUB);

      await session.receive({ type: 'reload' });

      expect(store.get('/ws')?.coordinator.request).toHaveBeenCalledExactlyOnceWith('refresh');
    });
  });
});
