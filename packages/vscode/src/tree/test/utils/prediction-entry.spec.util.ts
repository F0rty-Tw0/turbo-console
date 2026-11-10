import type { PredictionEntry, PredictionTicket, PredictionView } from '../../common/prediction.type.ts';
import { predictionKeyOf } from '../../utils/prediction-key.util.ts';
import { ROOT } from '../common/atom-load.const.ts';

/** A ticket of `ROOT` carrying `members`, with a fresh abort. */
export const predictionTicketOf = (members: string[]): PredictionTicket => {
  const ticket: PredictionTicket = { root: ROOT, members: new Set(members), controller: new AbortController() };

  return ticket;
};

/** Stores the entry of `packageName` of `ROOT` with `view` and no ticket, keyed as the store keys it. */
export const seedEntry = (entries: Map<string, PredictionEntry>, packageName: string, view: PredictionView | null = null): void => {
  const entry: PredictionEntry = { root: ROOT, packageName, view, ticket: null };

  entries.set(predictionKeyOf(ROOT, packageName), entry);
};

/** The entry of `packageName` of `ROOT`, if any. */
export const entryAt = (entries: Map<string, PredictionEntry>, packageName: string): PredictionEntry | undefined =>
  entries.get(predictionKeyOf(ROOT, packageName));
