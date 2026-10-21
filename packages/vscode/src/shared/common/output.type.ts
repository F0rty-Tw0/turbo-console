/** The "Turbo Console" log channel. `error`, `warn` and `info` take finished lines and never throw. */
export type Output = {
  readonly error: (line: string) => void;
  readonly warn: (line: string) => void;
  readonly info: (line: string) => void;
  readonly show: () => void;
  readonly dispose: () => void;
};
