/** The package row, or a task row of it, that Open, Reveal or Copy Path was invoked on. */
export type PackageTarget = {
  readonly root: string;
  readonly packageName: string;
};
