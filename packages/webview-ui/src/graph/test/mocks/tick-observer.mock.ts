import type { TickObserverClass, TickRunner } from '../common/tick-observer.type.ts';

const ignore = (): void => undefined;

/** An observer class that keeps each callback it is built with in `ticks`, for `vi.stubGlobal`, and observes nothing. */
export const tickObserverMock = (ticks: TickRunner[]): TickObserverClass => {
  class TickObserver {
    public constructor(callback: TickRunner) {
      ticks.push(callback);
    }

    public readonly observe = ignore;
  }

  return TickObserver;
};
