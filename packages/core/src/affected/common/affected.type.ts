import type { AffectedMode } from '../../workspace/common/workspace-model.type.ts';

/** One task turbo reports as affected: `id` is its `pkg#task`, `reason` the change kind turbo names, such as `TaskFileChanged`. */
export type AffectedTask = {
  readonly id: string;
  readonly reason: string;
};

/** `mode` comes from the root `turbo.json(c)`; `tasks` are turbo's own, not filtered against the model, sorted by id. */
export type AffectedResult = {
  readonly mode: AffectedMode;
  readonly tasks: AffectedTask[];
};

/** `base` and `head`: git refs passed to turbo as query variables; an omitted one uses turbo's default. `signal`: the caller's abort. */
export type ReadAffectedOptions = {
  readonly base?: string | undefined;
  readonly head?: string | undefined;
  readonly signal?: AbortSignal | undefined;
};
