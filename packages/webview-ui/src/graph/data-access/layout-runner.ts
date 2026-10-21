import type { ElkNode } from 'elkjs/lib/elk-api.js';

import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { ElkLike, LayoutResult, LayoutRunner, LayoutRunnerDeps } from '../common/layout.type.ts';
import { centresOf } from '../utils/elk-centres.util.ts';
import { gridPositions } from '../utils/grid-layout.util.ts';

/** Rejects on a worker `error` event, a rejected layout, or no layout within `timeoutMs`; the timer never outlives it. */
const layoutWithin = async (elk: ElkLike, graph: ElkNode, timeoutMs: number): Promise<ElkNode> => {
  const race = (resolve: (laidOut: ElkNode) => void, reject: (error: unknown) => void): void => {
    const timeOut = (): void => reject(new Error(`no ELK layout within ${timeoutMs} ms`));
    const timer = setTimeout(timeOut, timeoutMs);
    const succeed = (laidOut: ElkNode): void => {
      clearTimeout(timer);
      resolve(laidOut);
    };
    const fail = (error: unknown): void => {
      clearTimeout(timer);
      reject(error);
    };
    const failWith = (message: string): void => fail(new Error(message));

    elk.onError(failWith);
    void elk.layout(graph).then(succeed, fail);
  };

  return new Promise(race);
};

const failed = (): null => null;

/** The fallback's positions, or a plain grid when the fallback throws too, so a run always ends with a layout. */
const fallbackPositions = (fallback: LayoutRunnerDeps['fallback'], graph: ElkNode): Positions => {
  try {
    return fallback(graph);
  } catch {
    return gridPositions(graph);
  }
};

/**
 * Lays graphs out on one reused ELK. Any failure of the current run (no ELK, worker error, rejected layout, timeout)
 * drops that ELK and returns `deps.fallback` positions; the next run creates a fresh one.
 * A run that a newer run overtook resolves `null` whatever its outcome and touches nothing, so a stale timeout never
 * terminates the worker the newer run is using. A run that starts while another is in flight terminates that ELK and
 * lays out on a fresh one, because ELK works one job at a time: queued behind the stale job, the new run's timeout
 * would run out early.
 */
export const createLayoutRunner = (deps: LayoutRunnerDeps): LayoutRunner => {
  let elk: ElkLike | null = null;
  let latest = 0;
  let inFlight = 0;
  const dropBusyElk = (): void => {
    if (inFlight === 0) return;

    elk?.terminate();
    elk = null;
  };
  const run = async (hash: string, graph: ElkNode): Promise<LayoutResult | null> => {
    latest += 1;

    const ticket = latest;
    const start = performance.now();
    const resultOf = (positions: Positions, engine: LayoutResult['engine']): LayoutResult => {
      const ms = Math.round(performance.now() - start);
      const result: LayoutResult = { hash, positions, engine, ms };

      return result;
    };
    const fallbackResult = (): LayoutResult => {
      const positions = fallbackPositions(deps.fallback, graph);

      return resultOf(positions, 'fallback');
    };

    dropBusyElk();

    try {
      elk ??= deps.createElk();
    } catch {
      return fallbackResult();
    }

    const current = elk;

    inFlight += 1;

    const settled = layoutWithin(current, graph, deps.timeoutMs);
    const laidOut = await settled.catch(failed);

    inFlight -= 1;

    const isStale = ticket !== latest;

    if (isStale) return null;

    if (laidOut === null) {
      current.terminate();
      elk = null;

      return fallbackResult();
    }

    const positions = centresOf(laidOut);

    return resultOf(positions, 'elk');
  };
  const runner: LayoutRunner = { run };

  return runner;
};
