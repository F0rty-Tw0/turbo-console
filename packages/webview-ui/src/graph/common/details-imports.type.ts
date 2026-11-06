/** One import row of the block: `key` is `file:line` with the 0-based line, `number` the line as a reader counts it. */
export type ImportRowModel = {
  readonly key: string;
  readonly file: string;
  readonly line: number;
  readonly number: string;
  readonly text: string;
  readonly tags: string[];
  readonly label: string;
};

/** The rows of one file, in the order the host sent them. */
export type ImportGroupModel = {
  readonly file: string;
  readonly rows: ImportRowModel[];
};

/** A status is a coloured icon and a word. */
export type ImportsStatus = {
  readonly icon: 'info' | 'warning';
  readonly word: string;
};

/** What the imports block shows for one state, before any element is drawn. */
export type ImportsViewModel = {
  readonly heading: string;
  readonly scanLabel: string;
  readonly isScanning: boolean;
  readonly status: ImportsStatus | null;
  readonly lines: string[];
  readonly groups: ImportGroupModel[];
  readonly more: string | null;
  readonly notes: string[];
};
