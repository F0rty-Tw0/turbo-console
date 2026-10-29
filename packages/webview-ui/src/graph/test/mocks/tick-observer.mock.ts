import type { ObserveCall, TickObserverClass, TickRunner } from '../common/tick-observer.type.ts';

/** An `observe` that appends the arguments of each call to `calls`. */
const recorderOf = (calls: ObserveCall[]): ((...call: ObserveCall) => void) => {
  const record = (...call: ObserveCall): void => {
    calls.push(call);
  };

  return record;
};

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

    public readonly observe = recorderOf(observed);
  }

  return TickObserver;
};
