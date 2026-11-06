import { join } from 'node:path';

import type { GraphReady, GraphState } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openImport } from './graph-import-open.ts';
import type { ExplainContext, GraphPorts } from '../common/graph.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

const READY: GraphReady = { ...GRAPH_STATE_STUB, packages: [graphPackageOf('web', 'apps/web')], edges: [] };

const LOADING: GraphState = { kind: 'loading' };

const SOURCE_FILE = join(IMPORT_ROOT, 'apps', 'web', 'src', 'x.ts');

describe('FEATURE: open an import site', () => {
  let ports: GraphPorts;

  const contextOver = (state: GraphState): ExplainContext => {
    const over: ExplainContext = { state, root: IMPORT_ROOT, ports, canPost: () => true };

    return over;
  };

  beforeEach(() => {
    ports = graphPortsMock();
  });

  it("WHEN web's src/x.ts at line 4 is asked and the read gives text THEN it reads and opens that file at 4 and is true", async () => {
    vi.mocked(ports.readText).mockResolvedValue('import "a";');

    const handled = await openImport('web', 'src/x.ts', 4, contextOver(READY));

    expect(handled).toBe(true);
    expect(ports.readText).toHaveBeenCalledExactlyOnceWith(SOURCE_FILE);
    expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(SOURCE_FILE, 4);
  });

  it('WHEN the package is not listed THEN it is false and nothing is read', async () => {
    const handled = await openImport('ghost', 'src/x.ts', 4, contextOver(READY));

    expect(handled).toBe(false);
    expect(ports.readText).not.toHaveBeenCalled();
  });

  it('WHEN the state is not a graph THEN it is false and nothing is read', async () => {
    const handled = await openImport('web', 'src/x.ts', 4, contextOver(LOADING));

    expect(handled).toBe(false);
    expect(ports.readText).not.toHaveBeenCalled();
  });

  it("WHEN the file is '../a/x.ts' THEN it is false and nothing is read", async () => {
    const handled = await openImport('web', '../a/x.ts', 4, contextOver(READY));

    expect(handled).toBe(false);
    expect(ports.readText).not.toHaveBeenCalled();
  });

  it('WHEN the read gives null THEN nothing opens, the unreadable file is logged once, and it is true', async () => {
    const handled = await openImport('web', 'src/x.ts', 4, contextOver(READY));

    expect(handled).toBe(true);
    expect(ports.openAt).not.toHaveBeenCalled();
    expect(ports.log).toHaveBeenCalledExactlyOnceWith(`Not a readable source file: ${SOURCE_FILE}`);
  });

  it('WHEN the read rejects THEN nothing opens, the failure is logged, and it is true', async () => {
    vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));

    const handled = await openImport('web', 'src/x.ts', 4, contextOver(READY));

    expect(handled).toBe(true);
    expect(ports.openAt).not.toHaveBeenCalled();
    expect(ports.log).toHaveBeenCalledWith('EACCES');
  });

  it('WHEN openAt rejects THEN the failure is logged and it is true', async () => {
    vi.mocked(ports.readText).mockResolvedValue('import "a";');
    vi.mocked(ports.openAt).mockRejectedValue(new Error('no editor'));

    const handled = await openImport('web', 'src/x.ts', 4, contextOver(READY));

    expect(handled).toBe(true);
    expect(ports.log).toHaveBeenCalledExactlyOnceWith('no editor');
  });
});
