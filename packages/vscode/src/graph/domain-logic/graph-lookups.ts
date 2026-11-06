import type { GraphWebviewMessage } from '@turbo-console/webview-ui';

import { answerRequest } from './graph-explain.ts';
import { openImport } from './graph-import-open.ts';
import { ImportScans } from './import-scans.ts';
import { LatestWins } from './latest-wins.ts';
import type { ExplainContext, ExplainRequest, LookupGate, LookupRequest } from '../common/graph.type.ts';

type LookupJob = {
  readonly request: ExplainRequest;
  readonly value: unknown;
};

const LOOKUP_TYPES: Readonly<Record<LookupRequest['type'], true>> = {
  explainEdge: true,
  openManifest: true,
  scanImports: true,
  openImport: true
};

export function isLookupMessage(message: GraphWebviewMessage): message is LookupRequest {
  return Object.hasOwn(LOOKUP_TYPES, message.type);
}

/**
 * The page's look-ups into the graph. One `explainEdge` is answered at a time; the one waiting behind it is replaced by each
 * newer request, so a page that floods them costs one read in flight and one waiting. An `openManifest` is answered at once,
 * never behind a read. A scan runs in `ImportScans`, apart from the explain queue, so neither waits for the other (spec D1);
 * a `scanImports` for an edge already being asked returns at once, as the pending ask posts the one reply. A reply is posted
 * only if the panel is still shown and ready after its read; after `dispose` nothing more is read.
 */
export class GraphLookups {
  private readonly gate: LookupGate;
  private readonly explains = new LatestWins<LookupJob>();
  private readonly scans: ImportScans;
  private readonly scanning = new Set<string>();
  private isDisposed = false;

  public constructor(gate: LookupGate) {
    this.gate = gate;
    this.scans = new ImportScans(gate);
  }

  public async receive(request: LookupRequest, value: unknown): Promise<void> {
    switch (request.type) {
      case 'explainEdge':
        await this.explains.run({ request, value }, async (job) => this.answer(job));

        return;
      case 'openManifest':
        await this.answer({ request, value });

        return;
      case 'scanImports':
        if (this.isDisposed) return;

        await this.scan(request.source, request.target, value);

        return;
      case 'openImport': {
        if (this.isDisposed) return;

        const isHandled = await openImport(request.packageName, request.file, request.line, this.contextNow());

        if (!isHandled) this.gate.drop(value);

        return;
      }
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    this.scans.dispose();
  }

  private contextNow(): ExplainContext {
    const { state, root, ports, canPost } = this.gate;
    const context: ExplainContext = { state: state(), root, ports, canPost };

    return context;
  }

  private async scan(source: string, target: string, value: unknown): Promise<void> {
    const key = JSON.stringify([source, target]);

    const isScanning = this.scanning.has(key);

    if (isScanning) return;

    this.scanning.add(key);

    try {
      const isHandled = await this.scans.ask(source, target);

      if (!isHandled) this.gate.drop(value);
    } finally {
      this.scanning.delete(key);
    }
  }

  private async answer(job: LookupJob): Promise<void> {
    if (this.isDisposed) return;

    const { request, value } = job;
    const isHandled = await answerRequest(request, this.contextNow());

    if (!isHandled) this.gate.drop(value);
  }
}
