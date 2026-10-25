import type { AtomResult, DryRunRequest, DryRunState, TurboBinary } from '@turbo-console/core';

/**
 * What `AtomLoads` reads and calls. `binaryOf` is `null` for a folder whose turbo is not resolved. `dryRun` and `results`
 * each settle on their own; a failed one rejects. `changed` fires when the view of one package of `root` changed.
 */
export type AtomLoadPorts = {
  readonly binaryOf: (root: string) => TurboBinary | null;
  readonly dryRun: (binary: TurboBinary, request: DryRunRequest, signal: AbortSignal) => Promise<DryRunState[]>;
  readonly results: (root: string, fileIds: ReadonlySet<string>) => Promise<Map<string, AtomResult>>;
  readonly log: (line: string) => void;
  readonly changed: (root: string, packageName: string) => void;
};

/** The half of `AtomLoadPorts` the host builds; the tree adds `changed`, which redraws its own nodes. */
export type AtomHostPorts = Omit<AtomLoadPorts, 'changed'>;
