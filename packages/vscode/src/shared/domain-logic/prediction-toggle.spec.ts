import { describe, expect, it } from 'vitest';

import { PredictionToggle } from './prediction-toggle.ts';
import { togglePortsMock } from '../test/mocks/toggle-ports.mock.ts';

const KEY = 'turboConsole.predictionShown';

describe('FEATURE: PredictionToggle', () => {
  describe('GIVEN a stored predictionShown of true', () => {
    it('WHEN the toggle is built THEN it reads the stored choice and sends the prediction key with it', () => {
      const ports = togglePortsMock(true);

      const toggle = new PredictionToggle(ports);

      expect(toggle.isShown()).toBe(true);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, true);
    });

    it('WHEN set(false) runs THEN the prediction key is stored and sent', async () => {
      const ports = togglePortsMock(true);
      const toggle = new PredictionToggle(ports);

      await toggle.set(false);

      expect(ports.store.update).toHaveBeenCalledExactlyOnceWith(KEY, false);
      expect(ports.setKey).toHaveBeenLastCalledWith(KEY, false);
    });
  });

  describe('GIVEN nothing stored', () => {
    it('WHEN the toggle is built THEN it reads false (default off)', () => {
      const ports = togglePortsMock(undefined);

      const toggle = new PredictionToggle(ports);

      expect(toggle.isShown()).toBe(false);
      expect(ports.setKey).toHaveBeenCalledExactlyOnceWith(KEY, false);
    });
  });
});
