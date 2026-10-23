/** The page's first-frame clock (`GraphFrames`): when the latest graph arrived and how long its first drawn frame took. */
export type FrameClock = {
  readonly start: (at: number) => void;
  readonly arm: () => void;
  readonly mark: () => void;
  readonly receivedAt: () => number;
  readonly firstFrameMs: () => number | null;
};
