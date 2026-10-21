import { FALLBACK_TIMEOUT_MS } from '../../common/graph.const.ts';
import type { ElkLike, LayoutRunnerDeps } from '../../common/layout.type.ts';
import { fallbackMock } from '../mocks/elk.mock.ts';
import { FALLBACK_POSITIONS_STUB } from '../stubs/layout.stub.ts';

/** Runner deps with the real timeout; the fallback answers `FALLBACK_POSITIONS_STUB` unless given. */
export const runnerDepsOf = (
  createElk: () => ElkLike,
  fallback: LayoutRunnerDeps['fallback'] = fallbackMock(FALLBACK_POSITIONS_STUB)
): LayoutRunnerDeps => {
  const deps: LayoutRunnerDeps = { createElk, timeoutMs: FALLBACK_TIMEOUT_MS, fallback };

  return deps;
};
