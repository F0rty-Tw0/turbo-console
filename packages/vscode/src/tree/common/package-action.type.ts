/** The package row, or a task row of it, that Open, Reveal or Copy Path was invoked on. */
export type PackageTarget = {
  readonly root: string;
  readonly packageName: string;
};

/** Editor effects of the package actions: open a file, reveal a directory in the Explorer, copy text. */
export type PackageActionPorts = {
  readonly open: (file: string) => Promise<void>;
  readonly reveal: (directory: string) => Promise<void>;
  readonly copy: (text: string) => Promise<void>;
};
