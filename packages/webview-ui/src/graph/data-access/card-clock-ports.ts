import type { CardClockPorts } from '../common/card-clock.type.ts';

/** The browser's timers and visibility, read at call time, so a fake clock installed before or after load is the one used. */
export const cardClockPorts: CardClockPorts = {
  setInterval: (fn: () => void, ms: number): number => window.setInterval(fn, ms),
  clearInterval: (id: number): void => window.clearInterval(id),
  isHidden: (): boolean => document.hidden
};
