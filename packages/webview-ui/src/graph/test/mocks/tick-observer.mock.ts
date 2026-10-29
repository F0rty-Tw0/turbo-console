import type { ObserveCall, TickObserverClass, TickRunner } from '../common/tick-observer.type.ts';

/**
 * An observer class that keeps each callback it is built with in `ticks` and each `observe` call in `observed`, for
 * `vi.stubGlobal`, and observes nothing.
 */
export const tickObserverMock = <Args extends unknown[] = []>(
  ticks: TickRunner<Args>[],
  observed: ObserveCall[] = []
): TickObserverClass<Args> => {
  class TickObserver {
    public constructor(callback: TickRunner<Args>) {
      ticks.push(callback);
    }

    public readonly observe = (...call: ObserveCall): void => {
      observed.push(call);
    };
  }

  return TickObserver;
};
