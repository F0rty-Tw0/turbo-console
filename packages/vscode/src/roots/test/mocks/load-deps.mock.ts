import type { WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import type { LoadDeps } from '../../common/root.type.ts';
import { CACHED_WORKSPACE_STUB, TURBO_BINARY_STUB, WORKSPACE_MODEL_STUB } from '../stubs/root.stub.ts';

const runWork = async (work: () => Promise<WorkspaceModel>): Promise<WorkspaceModel> => work();

/** Every port succeeds: a binary, a fresh cache, a model, a free slot, progress that just runs the work. */
export const loadDepsMock = (): LoadDeps => {
  const resolve = vi.fn().mockResolvedValue(TURBO_BINARY_STUB);
  const readCached = vi.fn().mockResolvedValue(CACHED_WORKSPACE_STUB);
  const load = vi.fn().mockResolvedValue(WORKSPACE_MODEL_STUB);
  const acquire = vi.fn().mockResolvedValue(vi.fn());
  const deps: LoadDeps = {
    resolve,
    readCached,
    load,
    acquire,
    progress: vi.fn(runWork),
    log: vi.fn()
  };

  return deps;
};
