/** Editor effects of Copy Command: `shell` is `env.shell`, `write` the clipboard, `info` an information message. */
export type CopyPorts = {
  readonly shell: () => string;
  readonly write: (text: string) => Promise<void>;
  readonly info: (text: string) => void;
};
