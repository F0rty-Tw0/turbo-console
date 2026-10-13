/**
 * `cacheDir`: where the disk cache lives, when one is wanted; an absolute path in the editor's own storage, never
 * inside the workspace. `signal`: the caller's abort.
 */
export type LoadWorkspaceOptions = {
  readonly cacheDir?: string | undefined;
  readonly signal?: AbortSignal | undefined;
};
