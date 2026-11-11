import { describe, expect, it } from 'vitest';

import { AffectedToggle } from './affected-toggle.ts';
import { togglePortsMock } from '../test/mocks/toggle-ports.mock.ts';

const KEY = 'turboConsole.affectedShown';

describe('FEATURE: AffectedToggle', () => {
  describe('GIVEN a stored affectedShown of true', () => {
    it('WHEN the toggle is built THEN it reads the stored choice and sends the affected key with it', () => {
      const ports = togglePortsMock(true);

      const toggle = new AffectedToggle(ports);

      expect(toggle.isShown()).toBe(true);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, true);
    });

    it('WHEN set(false) runs THEN the affected key is stored and sent', async () => {
      const ports = togglePortsMock(true);
      const toggle = new AffectedToggle(ports);

      await toggle.set(false);

      expect(ports.store.update).toHaveBeenCalledExactlyOnceWith(KEY, false);
      expect(ports.setKey).toHaveBeenLastCalledWith(KEY, false);
    });
  });

  describe('GIVEN nothing stored', () => {
    it('WHEN the toggle is built THEN it reads false (default off) and sends false', () => {
      const ports = togglePortsMock(undefined);

      const toggle = new AffectedToggle(ports);

      expect(toggle.isShown()).toBe(false);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, false);
    });
  });
});
