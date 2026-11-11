import { describe, expect, it, vi } from 'vitest';

import { affectedListenersOf } from './affected-listeners.ts';
import type { AffectedListener } from '../common/affected.type.ts';
import { ROOT } from '../test/common/atom-load.const.ts';

describe('FEATURE: affected listeners', () => {
  describe('GIVEN two subscribed listeners', () => {
    it('WHEN a root changes THEN every listener hears the root', () => {
      const first = vi.fn<AffectedListener>();
      const second = vi.fn<AffectedListener>();
      const subscribers = affectedListenersOf(vi.fn());

      subscribers.onDidChange(first);
      subscribers.onDidChange(second);
      subscribers.changed(ROOT);

      expect(first).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT);
    });
  });

  describe('GIVEN a listener that threw first and a second one', () => {
    it('WHEN a root changes THEN the second hears it and the log names the error', () => {
      const log = vi.fn<(line: string) => void>();
      const second = vi.fn<AffectedListener>();
      const subscribers = affectedListenersOf(log);

      subscribers.onDidChange(() => {
        throw new Error('boom');
      });
      subscribers.onDidChange(second);
      subscribers.changed(ROOT);

      expect(second).toHaveBeenCalledExactlyOnceWith(ROOT);
      expect(log).toHaveBeenCalledExactlyOnceWith(`affected ${ROOT}: listener failed: boom`);
    });
  });

  describe('GIVEN a listener removed by its remover and a second one still subscribed', () => {
    it('WHEN a root changes THEN only the second hears it', () => {
      const removed = vi.fn<AffectedListener>();
      const kept = vi.fn<AffectedListener>();
      const subscribers = affectedListenersOf(vi.fn());
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
      const cleared = vi.fn<AffectedListener>();
      const subscribers = affectedListenersOf(vi.fn());

      subscribers.onDidChange(cleared);
      subscribers.clear();
      subscribers.changed(ROOT);

      expect(cleared).not.toHaveBeenCalled();
    });
  });
});
