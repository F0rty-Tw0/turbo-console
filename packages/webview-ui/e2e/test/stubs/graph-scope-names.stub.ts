/** The `[id, text]` of every node of `scopedNamesState` while scopes are hidden: the bare names. */
export const BARE_TEXTS_STUB: string[][] = [
  ['@org/app', 'app'],
  ['@org/lib', 'lib'],
  ['tool', 'tool']
];

/** The `[id, text]` of every node of `scopedNamesState` while scopes are shown: the full names. */
export const FULL_TEXTS_STUB: string[][] = [
  ['@org/app', '@org/app'],
  ['@org/lib', '@org/lib'],
  ['tool', 'tool']
];
