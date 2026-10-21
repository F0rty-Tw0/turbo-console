import elkConstructor from 'elkjs/lib/elk-api.js';
import type { ElkInstance, ElkNode } from 'elkjs/lib/elk-api.js';

import type { ElkLike } from '../common/layout.type.ts';
import type { ScriptUrlPolicy } from '../common/script-url-policy.type.ts';

type ErrorListener = (message: string) => void;

const constructElk = (blobUrl: string, workerFactory: () => Worker): ElkInstance => {
  try {
    return new elkConstructor({ workerFactory });
  } catch (error: unknown) {
    URL.revokeObjectURL(blobUrl);

    throw error;
  }
};

/**
 * One ELK over one blob worker running `workerText`. elk-api never forwards the worker's `error` event, so a pending
 * `layout()` would never settle; the client listens itself and hands the message to `onError`.
 * Split from `elk-client.ts` so specs can run it without the esbuild text import of the worker file.
 */
export const createElkClient = (workerText: string, policy: ScriptUrlPolicy): ElkLike => {
  const source = new Blob([`'use strict';\n${workerText}`], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(source);
  let errorListener: ErrorListener | null = null;
  const forwardError = (event: ErrorEvent): void => errorListener?.(event.message);
  const workerFactory = (): Worker => {
    const scriptUrl = policy.urlFor(blobUrl);
    const worker = new Worker(scriptUrl);

    worker.addEventListener('error', forwardError);

    return worker;
  };
  const elk = constructElk(blobUrl, workerFactory);
  const layout = async (graph: ElkNode): Promise<ElkNode> => elk.layout(graph);
  const onError = (listener: ErrorListener): void => {
    errorListener = listener;
  };
  const terminate = (): void => {
    elk.terminateWorker();
    URL.revokeObjectURL(blobUrl);
  };
  const client: ElkLike = { layout, onError, terminate };

  return client;
};
