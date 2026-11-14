import { elapsedText } from '../../bridge/utils/duration-text.util.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** A card's live clock: `elapsedText` under an hour, then whole hours and minutes (`1h 2m`), so row 2 stays narrow. */
export const cardClockText = (ms: number): string => {
  const isFiniteMs = Number.isFinite(ms);
  const isHours = isFiniteMs && ms >= HOUR_MS;

  if (!isHours) return elapsedText(ms);

  const hours = Math.floor(ms / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);

  return `${String(hours)}h ${String(minutes)}m`;
};
