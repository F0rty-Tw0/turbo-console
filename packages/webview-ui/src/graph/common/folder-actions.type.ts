/** A folder's actions outside the details panel and the list; each does exactly what its panel or list twin does. */
export type FolderActions = {
  /** Selects the folder as a tap on its header does, without moving focus. */
  readonly select: (folder: string) => void;
  readonly toggle: (folder: string) => void;
  readonly focusFolder: (folder: string) => void;
  readonly clearFocus: () => void;
  readonly showFolder: (folder: string) => void;
};
