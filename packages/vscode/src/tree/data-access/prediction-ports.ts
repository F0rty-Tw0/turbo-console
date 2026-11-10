import { readDryRun } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { PredictionHostPorts, PredictionTimer } from '../common/prediction.type.ts';

const timeouts = new WeakMap<PredictionTimer, ReturnType<typeof setTimeout>>();

const after: PredictionHostPorts['after'] = (run, ms) => {
  const timer: PredictionTimer = { id: null };

  timeouts.set(timer, setTimeout(run, ms));

  return timer;
};

const cancel: PredictionHostPorts['cancel'] = (timer) => {
  const timeout = timeouts.get(timer);

  if (timeout !== undefined) clearTimeout(timeout);
};

/**
 * The host half of the cache-prediction load ports: the root's resolved turbo, core's dry run, a real timer, the clock
 * and the output channel's warnings. The dry run is async, so a throw inside it rejects instead of escaping the store.
 */
export const editorPredictionPorts = (roots: Roots, output: Output): PredictionHostPorts => {
  const ports: PredictionHostPorts = {
    binaryOf: (root) => roots.get(root)?.state.binary ?? null,
    dryRun: async (binary, request, signal) => readDryRun(binary, request, { signal }),
    after,
    cancel,
    now: () => Date.now(),
    log: output.warn
  };

  return ports;
};
