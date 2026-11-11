import { readAffected } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { AffectedHostPorts } from '../common/affected.type.ts';

const refOf = (value: string | undefined): string | undefined => (value === undefined || value === '' ? undefined : value);

/**
 * The host half of the affected load ports: the root's resolved turbo, core's affected query, the clock and the output
 * channel's warnings. `turbo query` ignores `TURBO_SCM_BASE` and `TURBO_SCM_HEAD`, so the host passes them as core's
 * `base` and `head` when set and non-empty. The query is async, so a throw inside it rejects instead of escaping the store.
 */
export const editorAffectedPorts = (roots: Roots, output: Output, env: NodeJS.ProcessEnv = process.env): AffectedHostPorts => {
  const { TURBO_SCM_BASE, TURBO_SCM_HEAD } = env;
  const ports: AffectedHostPorts = {
    binaryOf: (root) => roots.get(root)?.state.binary ?? null,
    readAffected: async (binary, signal) => readAffected(binary, { base: refOf(TURBO_SCM_BASE), head: refOf(TURBO_SCM_HEAD), signal }),
    now: () => Date.now(),
    log: output.warn
  };

  return ports;
};
