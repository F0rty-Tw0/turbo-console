import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

import type { Positions } from '../../../bridge/common/graph-state.type.ts';
import type { ElkLike, LayoutRunnerDeps } from '../../common/layout.type.ts';
import type { ElkMock, PendingLayout, WorkerDouble } from '../common/elk-mock.type.ts';

/** An `ElkLike` whose layouts stay pending until the test settles them, oldest first. */
export const elkMock = (): ElkMock => {
  const pending: PendingLayout[] = [];
  let errorListener: (message: string) => void = (): void => undefined;
  const queueLayout = async (): Promise<ElkNode> => {
    const keep = (resolve: PendingLayout['resolve'], reject: PendingLayout['reject']): void => {
      pending.push({ resolve, reject });
    };

    return new Promise(keep);
  };
  const layout = vi.fn<ElkLike['layout']>(queueLayout);
  const terminate = vi.fn<ElkLike['terminate']>();
  const onError = (listener: (message: string) => void): void => {
    errorListener = listener;
  };
  const resolveLayout = (laidOut: ElkNode): void => {
    const oldest = pending.shift();

    oldest?.resolve(laidOut);
  };
  const rejectLayout = (error: Error): void => {
    const oldest = pending.shift();

    oldest?.reject(error);
  };
  const fireError = (message: string): void => errorListener(message);
  const elk: ElkLike = { layout, onError, terminate };
  const mock: ElkMock = { elk, layout, terminate, resolveLayout, rejectLayout, fireError };

  return mock;
};

/** The `Worker` surface elk-api and the client touch, as an `EventTarget` so tests can dispatch `error`. */
export const workerMock = (): WorkerDouble => {
  const members = { onmessage: null, postMessage: vi.fn<(message: unknown) => void>(), terminate: vi.fn<() => void>() };
  const worker: WorkerDouble = Object.assign(new EventTarget(), members);

  return worker;
};

/** A `Worker` constructor for `vi.stubGlobal` that hands out `worker`; `new` needs a `function`, not an arrow. */
export const workerConstructorMock = (worker: WorkerDouble): Mock<(url: string) => WorkerDouble> => {
  const constructWorker = function (): WorkerDouble {
    return worker;
  };

  return vi.fn<(url: string) => WorkerDouble>(constructWorker);
};

/** `trustedTypes.createPolicy` whose policy calls the given `createScriptURL`, as the browser's does. */
export const createPolicyMock = (): Mock<TrustedTypePolicyFactory['createPolicy']> => {
  const createPolicy = (name: string, options: TrustedTypePolicyOptions): TrustedTypePolicy => {
    const policy: TrustedTypePolicy = { name, createScriptURL: options.createScriptURL };

    return policy;
  };

  return vi.fn<TrustedTypePolicyFactory['createPolicy']>(createPolicy);
};

/**
 * An `ElkLike` that works one job at a time, as the ELK worker does: each layout resolves `laidOut` `jobMs` after the
 * job before it ended. Runs on the fake timers.
 */
export const serialElkMock = (laidOut: ElkNode, jobMs: number): ElkLike => {
  let freeAt = 0;
  const layout = async (): Promise<ElkNode> => {
    const now = performance.now();
    const startAt = Math.max(now, freeAt);

    freeAt = startAt + jobMs;

    const waitMs = freeAt - now;
    const finish = (resolve: (value: ElkNode) => void): void => {
      setTimeout((): void => resolve(laidOut), waitMs);
    };

    return new Promise(finish);
  };
  const elk: ElkLike = { layout, onError: vi.fn<ElkLike['onError']>(), terminate: vi.fn<ElkLike['terminate']>() };

  return elk;
};

/** A layout fallback that always throws, as Cytoscape's breadthfirst might. */
export const failingFallbackMock = (): Mock<LayoutRunnerDeps['fallback']> => {
  const fallback = (): Positions => {
    throw new Error('breadthfirst failed');
  };

  return vi.fn<LayoutRunnerDeps['fallback']>(fallback);
};

/** A layout fallback that always answers `positions`. */
export const fallbackMock = (positions: Positions): Mock<LayoutRunnerDeps['fallback']> => {
  const fallback = (): Positions => positions;

  return vi.fn<LayoutRunnerDeps['fallback']>(fallback);
};
