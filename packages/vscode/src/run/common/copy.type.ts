import type { TaskNode } from '@turbo-console/core';

/** The turbo task Copy Command writes: `singlePackage` is the model's mode, which ends the command with `--single-package`. */
export type TurboCopy = {
  readonly task: TaskNode;
  readonly packageName: string;
  readonly singlePackage: boolean;
};

/** Editor effects of Copy Command: `shell` is `env.shell`, `write` the clipboard, `info` an information message. */
export type CopyPorts = {
  readonly shell: () => string;
  readonly write: (text: string) => Promise<void>;
  readonly info: (text: string) => void;
};
