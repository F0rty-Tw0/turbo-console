import type { WorkspaceModel } from '@turbo-console/core';
import { vi } from 'vitest';

import type { LoadDeps, SessionPorts } from '../../common/root.type.ts';
import { loadDepsMock } from '../mocks/load-deps.mock.ts';
import { WORKSPACE_MODEL_STUB } from '../stubs/root.stub.ts';

/** Session ports whose roots each get `loadDepsMock()` deps around the session's own slots, with `overrides` on top. */
export const sessionPortsWith = (overrides: Partial<LoadDeps>): SessionPorts => {
  const depsFor = (_root: string, acquire: LoadDeps['acquire']): LoadDeps => {
    const base = loadDepsMock();
    const deps: LoadDeps = { ...base, acquire, ...overrides };

    return deps;
  };
  const ports: SessionPorts = { depsFor, now: () => 1, warn: vi.fn() };

  return ports;
};

/**
 * A load that holds for one timer tick. Each start pushes the number of these loads then running onto `peaks`, so the
 * highest entry is the most that ever ran at once and the length is how many ran.
 */
export const tickLoad = (peaks: number[]): LoadDeps['load'] => {
  const running = new Set<object>();
  const load = async (): Promise<WorkspaceModel> => {
    const token = {};

    running.add(token);
    peaks.push(running.size);
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
    running.delete(token);

    return WORKSPACE_MODEL_STUB;
  };

  return load;
};
