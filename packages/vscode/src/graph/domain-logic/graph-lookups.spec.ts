import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphLookups, isLookupMessage } from './graph-lookups.ts';
import type { ExplainRequest, GraphPorts, LookupGate } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';

const WEB_TO_A: ExplainRequest = { type: 'explainEdge', source: 'web', target: 'a' };
const WEB_TO_X: ExplainRequest = { type: 'explainEdge', source: 'web', target: '@org/x' };
const A_TO_X: ExplainRequest = { type: 'explainEdge', source: 'a', target: '@org/x' };
const GHOST_TO_A: ExplainRequest = { type: 'explainEdge', source: 'ghost', target: 'a' };
const OPEN_WEB: ExplainRequest = { type: 'openManifest', packageName: 'web', line: 3 };

describe('FEATURE: graph lookups', () => {
  let ports: GraphPorts;
  let canPost: Mock<() => boolean>;
  let drop: Mock<(value: unknown) => void>;
  let lookups: GraphLookups;

  beforeEach(() => {
    ports = graphPortsMock();
    canPost = vi.fn<() => boolean>(() => true);
    drop = vi.fn<(value: unknown) => void>();

    const gate: LookupGate = { root: '/ws', ports, state: () => GRAPH_STATE_STUB, canPost, drop };

    lookups = new GraphLookups(gate);
  });

  describe('GIVEN an explainEdge whose read is still pending', () => {
    let read: PromiseWithResolvers<string | null>;
    let first: Promise<void>;

    beforeEach(() => {
      read = Promise.withResolvers<string | null>();
      vi.mocked(ports.readText).mockReturnValueOnce(read.promise).mockResolvedValue('{}');
      first = lookups.receive(WEB_TO_A, 'first');
    });

    it('WHEN more explainEdge arrive THEN only the first and the last are read, in that order', async () => {
      const second = lookups.receive(WEB_TO_X, 'second');
      const last = lookups.receive(A_TO_X, 'last');

      await Promise.all([second, last]);

      expect(ports.readText).toHaveBeenCalledTimes(1);

      read.resolve('{}');
      await first;

      expect(ports.readText).toHaveBeenCalledTimes(2);
      expect(ports.readText).toHaveBeenLastCalledWith(join('/ws', 'packages/a', 'package.json'));
    });

    it('WHEN an openManifest arrives THEN it opens without waiting for the read', async () => {
      await lookups.receive(OPEN_WEB, 'open');

      expect(ports.openAt).toHaveBeenCalledTimes(1);

      read.resolve('{}');
      await first;
    });

    it('WHEN it is disposed before the read resolves THEN the request waiting behind is not read', async () => {
      await lookups.receive(A_TO_X, 'waiting');
      lookups.dispose();
      read.resolve('{}');
      await first;

      expect(ports.readText).toHaveBeenCalledTimes(1);
    });

    it('WHEN canPost turns false before the read resolves THEN no reply is posted', async () => {
      canPost.mockReturnValue(false);
      read.resolve('{}');
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a request the graph answers', () => {
    it('WHEN an explainEdge for a listed edge arrives THEN a reply is posted and nothing is dropped', async () => {
      await lookups.receive(WEB_TO_A, 'listed');

      expect(ports.post).toHaveBeenCalledTimes(1);
      expect(drop).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a request the graph does not answer', () => {
    it('WHEN an explainEdge names an unlisted package THEN nothing is read and the raw message is dropped', async () => {
      const value = { type: 'explainEdge', source: 'ghost', target: 'a' };

      await lookups.receive(GHOST_TO_A, value);

      expect(ports.readText).not.toHaveBeenCalled();
      expect(drop).toHaveBeenCalledExactlyOnceWith(value);
    });
  });

  describe('GIVEN a page message', () => {
    it('WHEN it is an explainEdge THEN it is a lookup', () => {
      const isLookup = isLookupMessage(WEB_TO_A);

      expect(isLookup).toBe(true);
    });

    it('WHEN it is an openManifest THEN it is a lookup', () => {
      const isLookup = isLookupMessage(OPEN_WEB);

      expect(isLookup).toBe(true);
    });

    it('WHEN it is a ready THEN it is not a lookup', () => {
      const isLookup = isLookupMessage({ type: 'ready' });

      expect(isLookup).toBe(false);
    });
  });
});
