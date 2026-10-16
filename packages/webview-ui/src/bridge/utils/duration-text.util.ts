const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** A negative or non-finite length (clock skew) counts as 0. */
const usableMs = (ms: number): number => {
  const isUsable = Number.isFinite(ms) && ms > 0;

  return isUsable ? ms : 0;
};

/** From 60 s: whole hours (never rolled into days), minutes and seconds, each floored, no zero padding. */
const longText = (ms: number): string => {
  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);
  const seconds = Math.floor((ms % MINUTE_MS) / 1000);
  const minutesText = `${String(minutes)}m ${String(seconds)}s`;

  if (hours === 0) return minutesText;

  return `${String(hours)}h ${minutesText}`;
};

/** The length of an ended run: floored tenths under 60 s (`59.9s`, never `60.0s`), else `longText`. */
export const durationText = (ms: number): string => {
  const usable = usableMs(ms);

  if (usable >= MINUTE_MS) return longText(usable);

  const tenths = Math.floor(usable / 100);

  return `${String(Math.floor(tenths / 10))}.${String(tenths % 10)}s`;
};

/** A running clock: floored whole seconds under 60 s, else `longText`. */
export const elapsedText = (ms: number): string => {
  const usable = usableMs(ms);

  if (usable >= MINUTE_MS) return longText(usable);

  return `${String(Math.floor(usable / 1000))}s`;
};
