/** Editor effects of Open Spec: open a file, show an error message. */
export type OpenSpecPorts = {
  readonly open: (file: string) => Promise<void>;
  readonly error: (text: string) => void;
};
