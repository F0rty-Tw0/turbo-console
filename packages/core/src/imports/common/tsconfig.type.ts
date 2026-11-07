/**
 * What one `tsconfig.json` adds to a chain (D6). `paths`: `undefined` = not set, `null` = set to `null` (it hides
 * inherited `paths`, OQ6). `baseUrl` is as written, relative to the file's dir.
 */
export type TsconfigFile = {
  readonly extends: string[];
  readonly paths: Record<string, string[]> | null | undefined;
  readonly baseUrl: string | undefined;
};

/** A file of the chain with the dir it was read from. */
export type TsconfigLink = {
  readonly dir: string;
  readonly file: TsconfigFile;
};
