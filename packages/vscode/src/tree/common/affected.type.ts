import type { AffectedResult, TurboBinary, WorkspaceModel } from '@turbo-console/core';

import type { RootChange } from '../../roots/common/coordinator.type.ts';

/** How turbo answered: per task (`task`) or per package (`package`), from the root `turbo.json(c)`. */
export type AffectedMode = AffectedResult['mode'];

/** `changed`: the task's own package changed; `dependency`: it runs because of another package or task. */
export type AffectedMark = 'changed' | 'dependency';

/** What the other tasks of a package say about it: a file reason among its kept rows, a kept upstream row its tasks depend on. */
export type AffectedPackageFlags = { readonly hasFileSibling: boolean; readonly hasAffectedUpstream: boolean };

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

/** What the host supplies to `AffectedLoads`: the model and the change callback come from the shared store. */
export type AffectedHostPorts = Omit<AffectedLoadPorts, 'changed' | 'modelOf'>;

/** Hears that the view or status of `root` changed. */
export type AffectedListener = (root: string) => void;

/** The listeners of a shared store: `changed` tells each one, `clear` drops them all. */
export type AffectedListeners = {
  readonly changed: AffectedListener;
  readonly onDidChange: (listener: AffectedListener) => () => void;
  readonly clear: () => void;
};

/** One `AffectedLoads` shared by the tree and the graph; `onDidChange` returns its remover. */
export type SharedAffected = {
  readonly view: (root: string) => AffectedView | null;
  readonly status: (root: string) => AffectedStatus;
  readonly rootShown: (root: string) => void;
  readonly toggled: (shown: boolean) => void;
  readonly modelChanged: (change: RootChange) => void;
  readonly refreshAll: () => void;
  readonly rootsKept: (kept: ReadonlySet<string>) => void;
  readonly dispose: () => void;
  readonly onDidChange: (listener: AffectedListener) => () => void;
};
