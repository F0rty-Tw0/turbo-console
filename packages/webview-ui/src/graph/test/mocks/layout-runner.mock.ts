import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { LayoutResult, LayoutRunner } from '../../common/layout.type.ts';
import type { LayoutRuns } from '../common/graph-layouts.type.ts';

type PendingRun = {
  readonly graph: ElkNode;
  readonly resolve: (result: LayoutResult | null) => void;
  readonly reject: (error: Error) => void;
};

const settledTasks = async (): Promise<void> => {
  const wait = (resolve: () => void): void => {
    setTimeout(resolve, 0);
  };

  return new Promise(wait);
};

/** A runner whose runs stay pending until `settle` or `fail`; it never drops a run itself, the test settles a dropped run with `null`. */
export const layoutRunsMock = (): LayoutRuns => {
  const pending: PendingRun[] = [];
  const run = async (_hash: string, graph: ElkNode): Promise<LayoutResult | null> => {
    const keep = (resolve: PendingRun['resolve'], reject: PendingRun['reject']): void => {
      pending.push({ graph, resolve, reject });
    };

    return new Promise(keep);
  };
  const runAt = (index: number): PendingRun => {
    const found = pending.at(index);

    if (found === undefined) throw new Error(`no run ${index}; ${pending.length} started`);

    return found;
  };
  const count = (): number => pending.length;
  const graphOf = (index: number): ElkNode => runAt(index).graph;
  const settle = async (index: number, result: LayoutResult | null): Promise<void> => {
    runAt(index).resolve(result);
    await settledTasks();
  };
  const fail = async (index: number, error: Error): Promise<void> => {
    runAt(index).reject(error);
    await settledTasks();
  };
  const runner: LayoutRunner = { run };
  const runs: LayoutRuns = { runner, count, graphOf, settle, fail };

  return runs;
};
