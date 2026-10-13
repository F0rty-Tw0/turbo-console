/** `cacheDir`: where the disk cache lives, when one is wanted (used from Task 14). `signal`: the caller's abort. */
export type LoadWorkspaceOptions = {
  readonly cacheDir?: string | undefined;
  readonly signal?: AbortSignal | undefined;
};
