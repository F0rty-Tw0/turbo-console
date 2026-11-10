import { describe, expect, it } from 'vitest';

import { ScopeToggle } from './scope-toggle.ts';
import { togglePortsMock } from '../test/mocks/toggle-ports.mock.ts';

const KEY = 'turboConsole.scopeShown';

describe('FEATURE: ScopeToggle', () => {
  describe('GIVEN a stored scopeShown of true', () => {
    it('WHEN the toggle is built THEN it reads the stored choice and sends the scope key with it', () => {
      const ports = togglePortsMock(true);

      const toggle = new ScopeToggle(ports);

      expect(toggle.isShown()).toBe(true);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, true);
    });

    it('WHEN set(false) runs THEN the scope key is stored and sent', async () => {
      const ports = togglePortsMock(true);
      const toggle = new ScopeToggle(ports);

      await toggle.set(false);

      expect(ports.store.update).toHaveBeenCalledExactlyOnceWith(KEY, false);
      expect(ports.setKey).toHaveBeenLastCalledWith(KEY, false);
    });
  });
});
