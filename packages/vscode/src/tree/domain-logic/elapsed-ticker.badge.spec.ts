import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Disposable } from 'vscode';

import { ElapsedTicker } from './elapsed-ticker.ts';
import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import { tickerPortsOf } from '../data-access/ticker-ports.ts';
import type { RunChangesFake, VisibleViewFake } from '../test/common/ticker-fakes.type.ts';
import { runChangesFake, visibleViewFake } from '../test/utils/ticker-fakes.spec.util.ts';

const entryOf = (taskId: string, state: RunState, root = '/ws'): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId, state };

  return entry;
};

describe('FEATURE: running badge of the Packages view', () => {
  let changes: RunChangesFake;
  let fake: VisibleViewFake;
  let ticker: ElapsedTicker;

  beforeEach(() => {
    changes = runChangesFake();
    fake = visibleViewFake(false);
    ticker = new ElapsedTicker(changes.runs, tickerPortsOf({ refreshTasks: () => undefined }));
  });

  afterEach(() => {
    ticker.dispose();
  });

  describe('GIVEN a bound view', () => {
    let binding: Disposable;

    beforeEach(() => {
      binding = ticker.bind(fake.view);
    });

    it('WHEN nothing runs THEN the view has no badge', () => {
      expect(fake.view.badge).toBeUndefined();
    });

    it('WHEN one run starts THEN the badge reads 1 running', () => {
      changes.emit(entryOf('a#dev', 'running'));

      expect(fake.view.badge).toStrictEqual({ value: 1, tooltip: '1 running' });
    });

    it('WHEN a second run starts on another root THEN the badge counts both', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('a#dev', 'running', '/other'));

      expect(fake.view.badge).toStrictEqual({ value: 2, tooltip: '2 running' });
    });

    it('WHEN a running run changes again THEN it still counts once', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('a#dev', 'running'));

      expect(fake.view.badge).toStrictEqual({ value: 1, tooltip: '1 running' });
    });

    it('WHEN both runs end THEN the badge is cleared', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('a#dev', 'running', '/other'));
      changes.emit(entryOf('a#dev', 'passed'));
      changes.emit(entryOf('a#dev', 'stopped', '/other'));

      expect(fake.view.badge).toBeUndefined();
    });

    describe('WHEN the binding is disposed while a run goes', () => {
      beforeEach(() => {
        changes.emit(entryOf('a#dev', 'running'));
        binding.dispose();
      });

      it('THEN the badge is cleared', () => {
        expect(fake.view.badge).toBeUndefined();
      });

      it('THEN a later run leaves the view without a badge', () => {
        changes.emit(entryOf('b#dev', 'running'));

        expect(fake.view.badge).toBeUndefined();
      });
    });
  });

  describe('GIVEN a run that started before any view was bound', () => {
    it('WHEN the view is bound THEN the badge counts it at once', () => {
      changes.emit(entryOf('a#dev', 'running'));

      ticker.bind(fake.view);

      expect(fake.view.badge).toStrictEqual({ value: 1, tooltip: '1 running' });
    });
  });
});
