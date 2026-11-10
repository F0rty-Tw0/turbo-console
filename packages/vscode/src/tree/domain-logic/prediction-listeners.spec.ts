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

  describe('GIVEN a removed listener and a cleared one', () => {
    it('WHEN a root changes THEN neither hears it', () => {
      const removed = vi.fn<PredictionListener>();
      const cleared = vi.fn<PredictionListener>();
      const subscribers = predictionListenersOf(vi.fn());
      const off = subscribers.onDidChange(removed);

      off();
      subscribers.onDidChange(cleared);
      subscribers.clear();
      subscribers.changed(ROOT);

      expect(removed).not.toHaveBeenCalled();
      expect(cleared).not.toHaveBeenCalled();
    });
  });
});
