/** The horizontal span of some nodes in container coordinates (rendered px). */
export type AnchorBox = {
  readonly x1: number;
  readonly x2: number;
};

/** What moved the camera or the panel: only a user's change, the panel opening or a switch to overlay pans clear. */
export type KeepClearTrigger = 'input' | 'filter' | 'opened' | 'layout' | 'restore' | 'refresh';
