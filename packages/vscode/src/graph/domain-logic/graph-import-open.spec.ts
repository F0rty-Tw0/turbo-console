import { join } from 'node:path';

import type { GraphState } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openImport } from './graph-import-open.ts';
import type { ExplainContext, GraphPorts } from '../common/graph.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';

const LOADING: GraphState = { kind: 'loading' };

const PACKAGE_DIR = join(IMPORT_ROOT, 'apps', 'web');

const SOURCE_FILE = join(PACKAGE_DIR, 'src', 'x.ts');

describe('FEATURE: open an import site', () => {
  let ports: GraphPorts;

  const contextOver = (state: GraphState): ExplainContext => {
    const over: ExplainContext = { state, root: IMPORT_ROOT, ports, canPost: () => true };

    return over;
  };

  beforeEach(() => {
    ports = graphPortsMock();
  });

  describe('GIVEN a graph that lists web at apps/web', () => {
    let context: ExplainContext;

    beforeEach(() => {
      context = contextOver(GRAPH_STATE_STUB);
    });

    it("WHEN web's src/x.ts at line 4 is asked and the read gives text THEN it reads and opens that file at 4 and is true", async () => {
      vi.mocked(ports.readText).mockResolvedValue('import "a";');

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(true);
      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(SOURCE_FILE);
      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(SOURCE_FILE, 4);
    });

    it('WHEN the package is not listed THEN it is false and nothing is read', async () => {
      const handled = await openImport('ghost', 'src/x.ts', 4, context);

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });

    it("WHEN the file is '../a/x.ts' THEN it is false and nothing is read", async () => {
      const handled = await openImport('web', '../a/x.ts', 4, context);

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });

    it('WHEN the file is a symlink that resolves outside the package THEN it is false and nothing is read', async () => {
      const outside = join(IMPORT_ROOT, 'secret', 'x.ts');

      vi.mocked(ports.realPath).mockImplementation(async (path) => Promise.resolve(path === SOURCE_FILE ? outside : path));
      vi.mocked(ports.readText).mockResolvedValue('secret');

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.openAt).not.toHaveBeenCalled();
    });

    it.each([
      ['the file', SOURCE_FILE],
      ['the package dir', PACKAGE_DIR]
    ])('WHEN realPath gives null for %s THEN it is false and nothing is read', async (_label, unresolved) => {
      vi.mocked(ports.realPath).mockImplementation(async (path) => Promise.resolve(path === unresolved ? null : path));

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });

    it('WHEN the root is reached through a symlink (both real paths move together) THEN it reads and opens the real file', async () => {
      const realFile = join(IMPORT_ROOT, '..', 'real-ws', 'apps', 'web', 'src', 'x.ts');
      const realDir = join(IMPORT_ROOT, '..', 'real-ws', 'apps', 'web');

      vi.mocked(ports.realPath).mockImplementation(async (path) => Promise.resolve(path === PACKAGE_DIR ? realDir : realFile));
      vi.mocked(ports.readText).mockResolvedValue('import "a";');

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(true);
      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(realFile);
      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(realFile, 4);
    });

    it('WHEN the read gives null THEN nothing opens, the unreadable file is logged once, and it is true', async () => {
      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(true);
      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`Not a readable source file: ${SOURCE_FILE}`);
    });

    it('WHEN the read rejects THEN nothing opens, the failure is logged, and it is true', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(true);
      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith('EACCES');
    });

    it('WHEN openAt rejects THEN the failure is logged and it is true', async () => {
      vi.mocked(ports.readText).mockResolvedValue('import "a";');
      vi.mocked(ports.openAt).mockRejectedValue(new Error('no editor'));

      const handled = await openImport('web', 'src/x.ts', 4, context);

      expect(handled).toBe(true);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('no editor');
    });
  });

  describe('GIVEN a state that is not a graph', () => {
    it('WHEN web at src/x.ts is asked THEN it is false and nothing is read', async () => {
      const handled = await openImport('web', 'src/x.ts', 4, contextOver(LOADING));

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });
  });
});
