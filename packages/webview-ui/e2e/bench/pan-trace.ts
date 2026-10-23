import type { LongTask } from './common/bench.type.ts';

const isWithin = (time: number, tOn: number, tOff: number): boolean => tOn <= time && time <= tOff;

/** Differences between consecutive frame times that fall in `[tOn, tOff]`, edges included. */
export const deltasOf = (frames: number[], tOn: number, tOff: number): number[] => {
  const inside = frames.filter((time): boolean => isWithin(time, tOn, tOff));

  return inside.slice(1).map((time, index): number => time - (inside[index] ?? time));
};

/** The longest duration among tasks that start in `[tOn, tOff]`, `0` for none. */
export const longestWithin = (tasks: LongTask[], tOn: number, tOff: number): number => {
  const inside = tasks.filter((task): boolean => isWithin(task.startTime, tOn, tOff));
  const durations = inside.map((task): number => task.duration);

  return Math.max(0, ...durations);
};
