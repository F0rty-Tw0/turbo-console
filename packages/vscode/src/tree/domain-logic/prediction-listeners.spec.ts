import { describe, expect, it, vi } from 'vitest';

import { predictionListenersOf } from './prediction-listeners.ts';
import type { PredictionListener } from '../common/prediction.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';

describe('FEATURE: prediction listeners', () => {
  describe('GIVEN a listener that threw first and a second one', () => {
    it('WHEN a root changes THEN the second hears it and the log names the error', () => {
      const log = vi.fn<(line: string) => void>();
      const second = vi.fn<PredictionListener>();
      const subscribers = predictionListenersOf(log);

      subscribers.onDidChange(() => {
        throw new Error('boom');
      });
      subscribers.onDidChange(second);
      subscribers.changed(ROOT);

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(log).toHaveBeenCalledExactlyOnceWith(`prediction ${ROOT}: listener failed: boom`);
    });
  });

  describe('GIVEN a listener removed by its remover and a second one still subscribed', () => {
    it('WHEN a root changes THEN only the second hears it', () => {
      const removed = vi.fn<PredictionListener>();
      const kept = vi.fn<PredictionListener>();
      const subscribers = predictionListenersOf(vi.fn());
      const off = subscribers.onDidChange(removed);

      subscribers.onDidChange(kept);
      off();
      subscribers.changed(ROOT);

      expect(removed).not.toHaveBeenCalled();
      expect(kept).toHaveBeenCalledExactlyOnceWith(ROOT);
    });
  });

  describe('GIVEN a listener and a clear of every listener', () => {
    it('WHEN a root changes THEN it hears nothing', () => {
      const cleared = vi.fn<PredictionListener>();
      const subscribers = predictionListenersOf(vi.fn());

      subscribers.onDidChange(cleared);
      subscribers.clear();
      subscribers.changed(ROOT);

      expect(cleared).not.toHaveBeenCalled();
    });
  });
});
