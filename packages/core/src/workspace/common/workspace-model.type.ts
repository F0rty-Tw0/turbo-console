export type TaskNodeKind = 'atom-aggregate' | 'atom-file' | 'atom-umbrella' | 'task';

/** Set for the three atom kinds: the Atomizer group, and whether the file task is live. */
export type TaskAtom = {
  readonly group: string;
  readonly isLive: boolean;
};

/** A visible task after rules 1–3 of spec §4.4, before dependencies are cut and descriptions joined. */
export type ClassifiedTask = {
  readonly id: string;
  readonly name: string;
  readonly command: string | null;
  readonly tags: string[];
  readonly rawDependencies: string[];
  readonly kind: TaskNodeKind;
  readonly atom: TaskAtom | null;
};

export type ClassifiedPackage = {
  readonly name: string;
  readonly path: string;
  readonly tags: string[];
  readonly tasks: ClassifiedTask[];
};

export type ClassifyResult = {
  readonly packages: ClassifiedPackage[];
  readonly warnings: string[];
};
