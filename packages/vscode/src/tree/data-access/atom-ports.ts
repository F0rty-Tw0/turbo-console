import { readAtomResults, readDryRun } from '@turbo-console/core';

import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { AtomHostPorts } from '../common/atom-load.type.ts';

/**
 * The host half of the Atomizer load ports: the root's resolved turbo, core's dry run and summary scan, and the output
 * channel's warnings. Both reads are async, so a throw inside them rejects instead of escaping `AtomLoads`.
 */
export const editorAtomPorts = (roots: Roots, output: Output): AtomHostPorts => {
  const ports: AtomHostPorts = {
    binaryOf: (root) => roots.get(root)?.state.binary ?? null,
    dryRun: async (binary, request, signal) => readDryRun(binary, request, { signal }),
    results: readAtomResults,
    log: output.warn
  };

  return ports;
};
