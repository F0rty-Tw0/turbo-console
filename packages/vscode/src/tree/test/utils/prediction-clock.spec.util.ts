import type { PredictionTimer } from '../../common/prediction.type.ts';
import type { FakeClock, FakeTimer } from '../common/prediction-clock.type.ts';

const isPending = (timer: FakeTimer): boolean => !timer.isCancelled && !timer.isFired;

/** Timers that never fire alone: `fire` runs every pending one once, oldest first; one it starts waits for the next `fire`. */
export const fakeClock = (): FakeClock => {
  const timers: FakeTimer[] = [];
  const handles = new Map<PredictionTimer, FakeTimer>();
  const after = (run: () => void, ms: number): PredictionTimer => {
    const timer: FakeTimer = { run, ms, isCancelled: false, isFired: false };
    const handle: PredictionTimer = { id: timers.length };

    timers.push(timer);
    handles.set(handle, timer);

    return handle;
  };
  const cancel = (handle: PredictionTimer): void => {
    const timer = handles.get(handle);

    if (timer !== undefined) timer.isCancelled = true;
  };
  const pendingTimers = (): FakeTimer[] => timers.filter(isPending);
  const fire = (): void => {
    for (const timer of pendingTimers()) {
      const isWaiting = isPending(timer);

      if (!isWaiting) continue;

      timer.isFired = true;
      timer.run();
    }
  };
  const clock: FakeClock = { after, cancel, timers, pendingTimers, fire };

  return clock;
};
