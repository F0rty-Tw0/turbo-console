import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { onTaskKey } from './graph-task-wiring.ts';

type KeyRig = {
  readonly clear: Mock<() => void>;
  readonly press: (key: string, repeat?: boolean) => void;
};

const keyRigOf = (isActive: boolean): KeyRig => {
  const clear = vi.fn<() => void>();
  const selection = { clear };
  const mode = { isActive: (): boolean => isActive, selection };
  const press = (key: string, repeat = false): void => onTaskKey({ key, repeat }, mode);
  const rig: KeyRig = { clear, press };

  return rig;
};

describe('FEATURE: onTaskKey', () => {
  describe('GIVEN task mode', () => {
    let rig: KeyRig;

    beforeEach(() => {
      rig = keyRigOf(true);
    });

    it('WHEN Escape is pressed THEN the task selection clears', () => {
      rig.press('Escape');

      expect(rig.clear).toHaveBeenCalledOnce();
    });

    it('WHEN Escape is held and repeats THEN nothing clears', () => {
      rig.press('Escape', true);

      expect(rig.clear).not.toHaveBeenCalled();
    });

    it('WHEN Enter is pressed THEN nothing clears', () => {
      rig.press('Enter');

      expect(rig.clear).not.toHaveBeenCalled();
    });
  });

  it('GIVEN package mode WHEN Escape is pressed THEN the task selection is left alone', () => {
    const rig = keyRigOf(false);

    rig.press('Escape');

    expect(rig.clear).not.toHaveBeenCalled();
  });
});
