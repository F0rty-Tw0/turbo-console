import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';

import type { ElkLike } from '../../common/layout.type.ts';

export type PendingLayout = {
  readonly resolve: (laidOut: ElkNode) => void;
  readonly reject: (error: Error) => void;
};

export type ElkMock = {
  readonly elk: ElkLike;
  readonly layout: Mock<ElkLike['layout']>;
  readonly terminate: Mock<ElkLike['terminate']>;
  /** Settles the oldest pending layout. */
  readonly resolveLayout: (laidOut: ElkNode) => void;
  /** Rejects the oldest pending layout. */
  readonly rejectLayout: (error: Error) => void;
  /** Calls the listener last given to `onError`. */
  readonly fireError: (message: string) => void;
};

type WorkerDoubleMembers = {
  /** elk-api assigns its answer handler here. */
  readonly onmessage: unknown;
  readonly postMessage: Mock<(message: unknown) => void>;
  readonly terminate: Mock<() => void>;
};

export type WorkerDouble = EventTarget & WorkerDoubleMembers;
