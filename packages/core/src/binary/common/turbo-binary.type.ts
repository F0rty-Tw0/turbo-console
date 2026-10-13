/** Where a binary came from: the workspace's own `turbo` package, or the caller's `overridePath`. */
export type TurboBinarySource = 'workspace' | 'override';

/** `trusted: true` is the caller's statement that the workspace is trusted; core never checks trust itself. */
export type ResolveTurboOptions = {
  readonly trusted: true;
  readonly overridePath?: string | undefined;
  readonly signal?: AbortSignal | undefined;
};

/** The native binary next to a workspace's own `turbo` package, and that package's version. */
export type WorkspaceTurbo = {
  readonly path: string;
  readonly version: string;
};
