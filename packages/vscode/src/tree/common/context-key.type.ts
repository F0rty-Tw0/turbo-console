/** A running send of one context key: `refresh` sends it again when the answer changed, `dispose` stops it. */
export type ContextKeyTracker = {
  readonly refresh: () => void;
  readonly dispose: () => void;
};
