/** The saved scroll position in a webview `getState()` value; 0 when nothing usable (a finite number from 0 up) was saved. */
export const readScrollY = (state: unknown): number => {
  if (typeof state !== 'object' || state === null) return 0;

  if (!('scrollY' in state)) return 0;

  const { scrollY } = state;

  if (typeof scrollY !== 'number') return 0;

  const isFinite = Number.isFinite(scrollY);
  const isUsable = isFinite && scrollY >= 0;

  if (!isUsable) return 0;

  return scrollY;
};
