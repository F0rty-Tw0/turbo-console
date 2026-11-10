import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { PredictionLaunch } from './prediction-launch.ts';
import type {
  PredictionBatchPort,
  PredictionEntry,
  PredictionTicket,
  PredictionView,
  PredictionWaitPort
} from '../common/prediction.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';
import { ID_A, NOW_0, PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import type { PredictionHarness } from '../test/common/prediction-load.type.ts';
import { dryRunAt, dryStateOf, flush } from '../test/utils/atom-load.spec.util.ts';
import { entryAt, predictionTicketOf, seedEntry } from '../test/utils/prediction-entry.spec.util.ts';
import { predictionHarness } from '../test/utils/prediction-load.spec.util.ts';
import { buildModelOf, predictionModelOf, turboTaskOf } from '../test/utils/prediction-model.spec.util.ts';

const HIT_VIEW: PredictionView = { settledAt: NOW_0, tasks: new Map([[ID_A, 'HIT']]) };

const EMPTY_VIEW: PredictionView = { settledAt: NOW_0, tasks: new Map() };

describe('FEATURE: prediction launch', () => {
  let h: PredictionHarness;
  let entries: Map<string, PredictionEntry>;
  let finished: Mock<PredictionBatchPort['finished']>;
  let leave: Mock<PredictionBatchPort['leave']>;
  let add: Mock<PredictionWaitPort['add']>;
  let launcher: PredictionLaunch;

  beforeEach(() => {
    h = predictionHarness();
    entries = new Map();
    finished = vi.fn<PredictionBatchPort['finished']>();
    leave = vi.fn<PredictionBatchPort['leave']>();
    add = vi.fn<PredictionWaitPort['add']>();
    launcher = new PredictionLaunch(h.ports, entries, { finished, leave }, { add });
  });

  describe.each([
    ['no binary', buildModelOf([PKG_A]), false],
    ['no model', null, true]
  ])('GIVEN a root with %s', (_given, model, hasBinary) => {
    let ticket: PredictionTicket;

    beforeEach(() => {
      h.model(ROOT, model);

      if (!hasBinary) h.noBinary();

      ticket = predictionTicketOf([PKG_A]);
      seedEntry(entries, PKG_A);
      launcher.launch(ticket);
    });

    it('WHEN the ticket launches THEN the entry is deleted and the package waits for the next model', () => {
      expect(entryAt(entries, PKG_A)).toBeUndefined();
      expect(add).toHaveBeenCalledExactlyOnceWith(ROOT, PKG_A);
    });

    it('WHEN the ticket launches THEN it is finished and nothing spawns', () => {
      expect(finished).toHaveBeenCalledExactlyOnceWith(ticket);
      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['no answer', null, 0],
    ['an answer', HIT_VIEW, 1]
  ])('GIVEN an entry with %s on a live ticket', (_given, view, announced) => {
    beforeEach(() => {
      h.noBinary();
      seedEntry(entries, PKG_A, view);
      launcher.launch(predictionTicketOf([PKG_A]));
    });

    it('WHEN the root has no binary at launch THEN it is parked and changed is called only if it had an answer', () => {
      expect(entryAt(entries, PKG_A)).toBeUndefined();
      expect(add).toHaveBeenCalledExactlyOnceWith(ROOT, PKG_A);
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });
  });

  describe('GIVEN a package with no requested task', () => {
    let ticket: PredictionTicket;

    beforeEach(() => {
      h.model(ROOT, predictionModelOf({ [PKG_A]: [turboTaskOf(PKG_A, 'dev', { persistent: true })] }));
      ticket = predictionTicketOf([PKG_A]);
      seedEntry(entries, PKG_A);
      launcher.launch(ticket);
    });

    it('WHEN the ticket launches THEN the package is Loaded with an empty answer and announced', () => {
      expect(entryAt(entries, PKG_A)).toStrictEqual({ root: ROOT, packageName: PKG_A, view: EMPTY_VIEW, ticket: null });
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN the ticket launches THEN the package leaves, the empty batch finishes and nothing spawns', () => {
      expect(leave).toHaveBeenCalledExactlyOnceWith(ticket, PKG_A);
      expect(finished).toHaveBeenCalledExactlyOnceWith(ticket);
      expect(h.dryRun).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ['no answer', null, 0],
    ['an answer', HIT_VIEW, 1]
  ])('GIVEN a package with %s that the model no longer holds', (_given, view, announced) => {
    let ticket: PredictionTicket;

    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_B]));
      ticket = predictionTicketOf([PKG_A]);
      seedEntry(entries, PKG_A, view);
      launcher.launch(ticket);
    });

    it('WHEN the ticket launches THEN its entry is deleted and it leaves the ticket', () => {
      expect(entryAt(entries, PKG_A)).toBeUndefined();
      expect(leave).toHaveBeenCalledExactlyOnceWith(ticket, PKG_A);
    });

    it('WHEN the ticket launches THEN it does not wait and is announced only if it had an answer', () => {
      expect(add).not.toHaveBeenCalled();
      expect(h.changed).toHaveBeenCalledTimes(announced);
    });
  });

  describe('GIVEN two packages launched together', () => {
    let ticket: PredictionTicket;

    beforeEach(() => {
      h.model(ROOT, buildModelOf([PKG_A, PKG_B]));
      ticket = predictionTicketOf([PKG_A, PKG_B]);
      seedEntry(entries, PKG_A);
      seedEntry(entries, PKG_B);
      launcher.launch(ticket);
      seedEntry(entries, PKG_B);
    });

    it('WHEN the ticket launches THEN one dry run asks for both under the ticket signal', () => {
      expect(dryRunAt(h, 0).request.packages).toStrictEqual([PKG_A, PKG_B]);
      expect(dryRunAt(h, 0).signal).toBe(ticket.controller.signal);
    });

    it('WHEN the run settles OK THEN only the entry still on the ticket stores, announced once', async () => {
      dryRunAt(h, 0).resolve([dryStateOf(ID_A, 'HIT')]);
      await flush();

      expect(entryAt(entries, PKG_A)).toStrictEqual({ root: ROOT, packageName: PKG_A, view: HIT_VIEW, ticket: null });
      expect(entryAt(entries, PKG_B)).toStrictEqual({ root: ROOT, packageName: PKG_B, view: null, ticket: null });
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN the run settles OK THEN the ticket is finished', async () => {
      dryRunAt(h, 0).resolve([]);
      await flush();

      expect(finished).toHaveBeenCalledExactlyOnceWith(ticket);
    });

    it('WHEN the run rejects THEN the entry on the ticket fails with one log line and is announced', async () => {
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(entryAt(entries, PKG_A)).toStrictEqual({ root: ROOT, packageName: PKG_A, view: null, ticket: null });
      expect(h.log).toHaveBeenCalledExactlyOnceWith(`prediction ${ROOT} ${PKG_A}: boom`);
      expect(h.changed).toHaveBeenCalledExactlyOnceWith(ROOT, new Set([PKG_A]));
    });

    it('WHEN the run rejects THEN the ticket is finished', async () => {
      dryRunAt(h, 0).reject(new Error('boom'));
      await flush();

      expect(finished).toHaveBeenCalledExactlyOnceWith(ticket);
    });
  });

  describe.each([
    ['no entry left on the ticket', false],
    ['an aborted ticket', true]
  ])('GIVEN a launched ticket with %s', (_given, isAborted) => {
    let ticket: PredictionTicket;

    beforeEach(async () => {
      h.model(ROOT, buildModelOf([PKG_A]));
      ticket = predictionTicketOf([PKG_A]);
      seedEntry(entries, PKG_A);
      launcher.launch(ticket);

      if (isAborted) ticket.controller.abort();
      else entries.clear();

      dryRunAt(h, 0).reject(new Error('aborted'));
      await flush();
    });

    it('WHEN the run rejects THEN nothing is logged or announced', () => {
      expect(h.log).not.toHaveBeenCalled();
      expect(h.changed).not.toHaveBeenCalled();
    });

    it('WHEN the run rejects THEN the ticket is still finished', () => {
      expect(finished).toHaveBeenCalledExactlyOnceWith(ticket);
    });
  });
});
