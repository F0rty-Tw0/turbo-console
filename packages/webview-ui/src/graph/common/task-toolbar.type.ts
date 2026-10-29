/** The selected task's node toolbar: its root and the buttons it holds. */
export type TaskToolbarElements = {
  readonly root: HTMLElement;
  readonly run: HTMLButtonElement;
  readonly showPackage: HTMLButtonElement | null;
  readonly ellipsis: HTMLButtonElement;
};

/** The buttons of the task toolbar. */
export type TaskToolbarKind = 'run' | 'showPackage' | 'ellipsis';
