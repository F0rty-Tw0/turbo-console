/** A `turbo.json(c)` that parsed; `warning` is set when both files exist in its directory. */
export type TurboConfigOk = {
  readonly path: string;
  readonly descriptions: Record<string, string>;
  readonly affectedUsingTaskInputs: boolean;
  readonly warning?: string | undefined;
};

/** A `turbo.json(c)` that did not parse; `error` names the first problem. */
export type TurboConfigError = {
  readonly path: string;
  readonly error: string;
};

/** One config file read; `path` is the file's posix path relative to the workspace root (`turbo.json` = root). */
export type TurboConfigFile = TurboConfigError | TurboConfigOk;
