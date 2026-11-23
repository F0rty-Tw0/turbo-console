/** One import row as the module Details block shows it: the importing file, the 1-based line, the text and the tags in order. */
export type ModuleRowFacts = {
  readonly file: string;
  readonly number: number;
  readonly text: string;
  readonly tags: string[];
};

/** One group of a module Details block: its `h4` label (a target or an importing file) and its rows in order. */
export type ModuleGroupFacts = {
  readonly label: string;
  readonly rows: ModuleRowFacts[];
};
