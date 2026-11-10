import { describe, expect, it } from 'vitest';

import { entriesOfTicket } from './prediction-entries.util.ts';
import type { PredictionEntry, PredictionTicket } from '../common/prediction-batch.type.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';

const ROOT = '/ws';

const ticketOf = (): PredictionTicket => {
  const ticket: PredictionTicket = { root: ROOT, members: new Set<string>(), controller: new AbortController() };

  return ticket;
};

const entryOf = (packageName: string, ticket: PredictionTicket | null): PredictionEntry => {
  const entry: PredictionEntry = { root: ROOT, packageName, view: null, ticket };

  return entry;
};

describe('FEATURE: entries of a ticket', () => {
  describe('GIVEN entries that wait on two tickets and one that waits on none', () => {
    const first = ticketOf();
    const second = ticketOf();
    const entries = [entryOf(PKG_A, first), entryOf(PKG_B, second), entryOf('@fx/c', null)];

    it('WHEN the first ticket is asked THEN only its entries come back', () => {
      expect(entriesOfTicket(entries, first)).toStrictEqual([entries[0]]);
    });

    it('WHEN a ticket no entry points at is asked THEN nothing comes back', () => {
      expect(entriesOfTicket(entries, ticketOf())).toStrictEqual([]);
    });

    it('WHEN the entries come from a map THEN its values are read', () => {
      const map = new Map(entries.map((entry) => [entry.packageName, entry]));

      expect(entriesOfTicket(map.values(), second)).toStrictEqual([entries[1]]);
    });
  });
});
