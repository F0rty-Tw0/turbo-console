import type { PredictionEntry, PredictionTicket } from '../common/prediction-batch.type.ts';

/** The entries still waiting on `ticket`: a result of a ticket no entry points at changes nothing. */
export const entriesOfTicket = (entries: Iterable<PredictionEntry>, ticket: PredictionTicket): PredictionEntry[] => {
  const isOfTicket = (entry: PredictionEntry): boolean => entry.ticket === ticket;

  const all = [...entries];

  return all.filter(isOfTicket);
};
