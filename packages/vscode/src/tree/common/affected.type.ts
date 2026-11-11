import type { AffectedResult } from '@turbo-console/core';

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
