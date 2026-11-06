import type { GraphWebviewMessage } from '@turbo-console/webview-ui';

import { answerRequest } from './graph-explain.ts';
import { LatestWins } from './latest-wins.ts';
import type { ExplainContext, ExplainRequest, LookupGate } from '../common/graph.type.ts';

type LookupJob = {
  readonly request: ExplainRequest;
  readonly value: unknown;
};

const LOOKUP_TYPES: Readonly<Record<ExplainRequest['type'], true>> = {
  explainEdge: true,
  openManifest: true
};

export function isLookupMessage(message: GraphWebviewMessage): message is ExplainRequest {
  return Object.hasOwn(LOOKUP_TYPES, message.type);
}

/**
 * The page's look-ups into the graph. One `explainEdge` is answered at a time; the one waiting behind it is replaced by each
 * newer request, so a page that floods them costs one read in flight and one waiting. An `openManifest` is answered at once,
 * never behind a read. A reply is posted only if the panel is still shown and ready after its read; after `dispose` nothing
 * more is read.
 */
export class GraphLookups {
  private readonly gate: LookupGate;
  private readonly explains = new LatestWins<LookupJob>();
  private isDisposed = false;

  public constructor(gate: LookupGate) {
    this.gate = gate;
  }

  public async receive(request: ExplainRequest, value: unknown): Promise<void> {
    switch (request.type) {
      case 'explainEdge':
        await this.explains.run({ request, value }, async (job) => this.answer(job));

        return;
      case 'openManifest':
        await this.answer({ request, value });

        return;
    }
  }

  public dispose(): void {
    this.isDisposed = true;
  }

  private async answer(job: LookupJob): Promise<void> {
    if (this.isDisposed) return;

    const { request, value } = job;
    const { state, root, ports, canPost } = this.gate;
    const context: ExplainContext = { state: state(), root, ports, canPost };
    const isHandled = await answerRequest(request, context);

    if (!isHandled) this.gate.drop(value);
  }
}
