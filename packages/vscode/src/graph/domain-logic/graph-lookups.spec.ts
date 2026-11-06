import { join } from 'node:path';

import type { PackageImportScan } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { GraphLookups, isLookupMessage } from './graph-lookups.ts';
import type { ExplainRequest, GraphPorts, LookupGate, LookupRequest } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { importScanOf } from '../test/utils/import-scan.spec.util.ts';
import { pendingScanOf } from '../test/utils/import-scans.spec.util.ts';

const WEB_TO_A: ExplainRequest = { type: 'explainEdge', source: 'web', target: 'a' };
const WEB_TO_X: ExplainRequest = { type: 'explainEdge', source: 'web', target: '@org/x' };
const A_TO_X: ExplainRequest = { type: 'explainEdge', source: 'a', target: '@org/x' };
const GHOST_TO_A: ExplainRequest = { type: 'explainEdge', source: 'ghost', target: 'a' };
const OPEN_WEB: ExplainRequest = { type: 'openManifest', packageName: 'web', line: 3 };
const SCAN_WEB_A: LookupRequest = { type: 'scanImports', source: 'web', target: 'a' };
const SCAN_WEB_X: LookupRequest = { type: 'scanImports', source: 'web', target: '@org/x' };
const SCAN_GHOST_A: LookupRequest = { type: 'scanImports', source: 'ghost', target: 'a' };
const OPEN_IMPORT_WEB: LookupRequest = { type: 'openImport', packageName: 'web', file: 'src/x.ts', line: 4 };

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

  describe('GIVEN a scanImports whose scan is still pending', () => {
    let pending: PromiseWithResolvers<PackageImportScan>;
    let first: Promise<void>;

    const askAgain = async (request: LookupRequest = SCAN_WEB_A): Promise<void> => lookups.receive(request, 'again');

    const settle = async (): Promise<void> => {
      pending.resolve(importScanOf([]));
      await first;
    };

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = lookups.receive(SCAN_WEB_A, 'first');
    });

    it('WHEN the scan settled and the edge is asked again THEN a second reply is posted', async () => {
      await settle();
      await askAgain();

      expect(ports.post).toHaveBeenCalledTimes(2);
    });

    it('WHEN another edge of the same package is asked THEN each edge gets its reply', async () => {
      const second = askAgain(SCAN_WEB_X);

      await settle();
      await second;

      expect(ports.post).toHaveBeenCalledTimes(2);
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
      const value = { ...GHOST_TO_A, raw: true };

      await lookups.receive(GHOST_TO_A, value);

      expect(ports.readText).not.toHaveBeenCalled();
      expect(drop).toHaveBeenCalledExactlyOnceWith(value);
    });
  });

  describe('GIVEN a scanImports after dispose', () => {
    it('WHEN it names an unlisted edge THEN nothing is scanned or dropped', async () => {
      lookups.dispose();
      await lookups.receive(SCAN_GHOST_A, 'late');

      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(drop).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an openImport after dispose', () => {
    it('WHEN it arrives THEN nothing is read, opened or dropped', async () => {
      lookups.dispose();
      await lookups.receive(OPEN_IMPORT_WEB, 'late');

      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.openAt).not.toHaveBeenCalled();
      expect(drop).not.toHaveBeenCalled();
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

    it.each([
      ['a scanImports', SCAN_WEB_A],
      ['an openImport', OPEN_IMPORT_WEB]
    ])('WHEN it is %s THEN it is a lookup', (_label, message) => {
      const isLookup = isLookupMessage(message);

      expect(isLookup).toBe(true);
    });

    it('WHEN it is a ready THEN it is not a lookup', () => {
      const isLookup = isLookupMessage({ type: 'ready' });

      expect(isLookup).toBe(false);
    });
  });
});
