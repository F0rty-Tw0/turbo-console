import { describe, expect, it, vi } from 'vitest';

import { PredictionToggle } from './prediction-toggle.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

const KEY = 'turboConsole.predictionShown';

describe('FEATURE: PredictionToggle', () => {
  describe('GIVEN a stored predictionShown of true', () => {
    const portsOf = (): ScriptsTogglePorts => {
      const store = { get: (): unknown => true, update: vi.fn(async () => Promise.resolve()) };
      const ports: ScriptsTogglePorts = { store, setKey: vi.fn(async () => Promise.resolve()), log: vi.fn() };

      return ports;
    };

    it('WHEN the toggle is built THEN it reads the stored choice and sends the prediction key with it', () => {
      const ports = portsOf();

      const toggle = new PredictionToggle(ports);

      expect(toggle.isShown()).toBe(true);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, true);
    });

    it('WHEN set(false) runs THEN the prediction key is stored and sent', async () => {
      const ports = portsOf();
      const toggle = new PredictionToggle(ports);

      await toggle.set(false);

      expect(ports.store.update).toHaveBeenCalledExactlyOnceWith(KEY, false);
      expect(ports.setKey).toHaveBeenLastCalledWith(KEY, false);
    });
  });

  describe('GIVEN nothing stored', () => {
    it('WHEN the toggle is built THEN it reads false (default off)', () => {
      const store = { get: (): unknown => undefined, update: vi.fn(async () => Promise.resolve()) };
      const ports: ScriptsTogglePorts = { store, setKey: vi.fn(async () => Promise.resolve()), log: vi.fn() };

      const toggle = new PredictionToggle(ports);

      expect(toggle.isShown()).toBe(false);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, false);
    });
  });
});
