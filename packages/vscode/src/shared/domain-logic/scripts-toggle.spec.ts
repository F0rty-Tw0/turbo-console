import { describe, expect, it, vi } from 'vitest';

import { ScriptsToggle } from './scripts-toggle.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

const KEY = 'turboConsole.scriptsShown';

describe('FEATURE: ScriptsToggle', () => {
  describe('GIVEN a stored scriptsShown of true', () => {
    const portsOf = (): ScriptsTogglePorts => {
      const store = { get: (): unknown => true, update: vi.fn(async () => Promise.resolve()) };
      const ports: ScriptsTogglePorts = { store, setKey: vi.fn(async () => Promise.resolve()), log: vi.fn() };

      return ports;
    };

    it('WHEN the toggle is built THEN it reads the stored choice and sends the scripts key with it', () => {
      const ports = portsOf();

      const toggle = new ScriptsToggle(ports);

      expect(toggle.isShown()).toBe(true);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, true);
    });

    it('WHEN set(false) runs THEN the scripts key is stored and sent', async () => {
      const ports = portsOf();
      const toggle = new ScriptsToggle(ports);

      await toggle.set(false);

      expect(ports.store.update).toHaveBeenCalledExactlyOnceWith(KEY, false);
      expect(ports.setKey).toHaveBeenLastCalledWith(KEY, false);
    });
  });
});
