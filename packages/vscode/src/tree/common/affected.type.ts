import type { AffectedResult, TurboBinary, WorkspaceModel } from '@turbo-console/core';

/** How turbo answered: per task (`task`) or per package (`package`), from the root `turbo.json(c)`. */
export type AffectedMode = AffectedResult['mode'];

/** `changed`: the task's own package changed; `dependency`: it runs because of another package or task. */
export type AffectedMark = 'changed' | 'dependency';

/** `line` is the full task tooltip line. */
export type AffectedEntry = { readonly mark: AffectedMark; readonly line: string };

/** `tasks` holds the kept tasks of one root, keyed by task id `pkg#task`. */
export type AffectedView = {
  readonly settledAt: number;
  readonly mode: AffectedMode;
  readonly tasks: ReadonlyMap<string, AffectedEntry>;
};

/** `absent`: nothing asked yet (or the toggle is off); `loading`: a query is live; `loaded`: it answered; `failed`: it rejected. */
export type AffectedStatus = 'absent' | 'loading' | 'loaded' | 'failed';

/**
 * What `AffectedLoads` reads and calls. `binaryOf` is `null` for a folder whose turbo is not resolved. `changed` fires
 * when the view or status of `root` changed.
 */
export type AffectedLoadPorts = {
  readonly binaryOf: (root: string) => TurboBinary | null;
  readonly modelOf: (root: string) => WorkspaceModel | null;
  readonly readAffected: (binary: TurboBinary, signal: AbortSignal) => Promise<AffectedResult>;
  readonly now: () => number;
  readonly log: (line: string) => void;
  readonly changed: (root: string) => void;
};
