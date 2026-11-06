import type { ImportScanInput, PackageImportScan } from '@turbo-console/core';
import type { EdgeImportsResult, GraphEdgeImportsMessage, GraphHostMessage } from '@turbo-console/webview-ui';
import { vi } from 'vitest';

import type { GraphPorts, ScanGate } from '../../common/graph.type.ts';
import { IMPORT_ROOT } from '../common/import-edge.const.ts';
import { GRAPH_STATE_STUB } from '../stubs/graph-model.stub.ts';

/** The gate `ImportScans` takes: `IMPORT_ROOT`, the stub graph and a panel that can post; `patch` overrides any of them. */
export const scansGateOf = (ports: GraphPorts, patch: Partial<ScanGate> = {}): ScanGate => {
  const gate: ScanGate = { root: IMPORT_ROOT, ports, state: () => GRAPH_STATE_STUB, canPost: () => true, ...patch };

  return gate;
};

/** Makes the next `scanImports` call return the promise this gives, so a spec settles the scan when it chooses. */
export const pendingScanOf = (ports: GraphPorts): PromiseWithResolvers<PackageImportScan> => {
  const pending = Promise.withResolvers<PackageImportScan>();

  vi.mocked(ports.scanImports).mockReturnValueOnce(pending.promise);

  return pending;
};

/** The `edgeImports` reply for the edge `source` → `target`. */
export const importsReplyOf = (source: string, target: string, result: EdgeImportsResult): GraphEdgeImportsMessage => {
  const reply: GraphEdgeImportsMessage = { type: 'edgeImports', source, target, result };

  return reply;
};

/** Every message `ports.post` was given, in order. */
export const postedOf = (ports: GraphPorts): GraphHostMessage[] => vi.mocked(ports.post).mock.calls.map(([message]) => message);

/** The input of every `scanImports` call, in order. */
export const scanInputsOf = (ports: GraphPorts): ImportScanInput[] => vi.mocked(ports.scanImports).mock.calls.map(([input]) => input);
