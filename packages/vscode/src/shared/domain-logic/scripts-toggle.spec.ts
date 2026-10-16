import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScriptsToggle } from './scripts-toggle.ts';
import type { ScriptsTogglePorts, ToggleStore } from '../common/scripts-toggle.type.ts';

const KEY = 'turboConsole.scriptsShown';

/** One macrotask: every fake reached before it has run to its first await. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

type Gate = {
  readonly promise: Promise<void>;
  readonly open: () => void;
};

const gateOf = (): Gate => {
  let open: () => void = () => undefined;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  const gate: Gate = { promise, open };

  return gate;
};

describe('FEATURE: ScriptsToggle', () => {
  let calls: string[];
  let stored: Map<string, unknown>;
  let updateGates: Promise<void>[];
  let updateFailures: Error[];
  let setKey: ReturnType<typeof vi.fn<ScriptsTogglePorts['setKey']>>;
  let log: ReturnType<typeof vi.fn<ScriptsTogglePorts['log']>>;
  let ports: ScriptsTogglePorts;

  const toggleOf = (): ScriptsToggle => new ScriptsToggle(ports);

  const builtToggle = async (): Promise<ScriptsToggle> => {
    const toggle = toggleOf();

    await flush();
    calls.length = 0;

    return toggle;
  };

  beforeEach(() => {
    calls = [];
    stored = new Map();
    updateGates = [];
    updateFailures = [];
    setKey = vi.fn(async (value: boolean): Promise<void> => {
      await flush();
      calls.push(`setKey:${String(value)}`);
    });
    log = vi.fn();

    const store: ToggleStore = {
      get: (key) => stored.get(key),
      update: async (key, value) => {
        await updateGates.shift();
        await flush();

        const failure = updateFailures.shift();

        if (failure !== undefined) throw failure;

        calls.push(`update:${String(value)}`);
        stored.set(key, value);
      }
    };

    ports = { store, setKey, log };
  });

  describe.each([
    { given: 'nothing stored', value: undefined, expected: false },
    { given: 'a stored false', value: false, expected: false },
    { given: 'a stored string', value: 'true', expected: false },
    { given: 'a stored number', value: 1, expected: false },
    { given: 'a stored true', value: true, expected: true }
  ])('GIVEN $given', ({ value, expected }) => {
    beforeEach(() => {
      if (value !== undefined) stored.set(KEY, value);
    });

    it('WHEN the toggle is built THEN isShown reads the stored choice, true only for true', () => {
      const toggle = toggleOf();

      expect(toggle.isShown()).toBe(expected);
    });

    it('WHEN the toggle is built THEN the key is sent once with the choice', () => {
      toggleOf();

      expect(setKey.mock.calls).toStrictEqual([[expected]]);
    });
  });

  describe('GIVEN the editor rejects the startup key', () => {
    it('WHEN the toggle is built THEN the failure is logged', async () => {
      setKey.mockRejectedValueOnce(new Error('boom'));

      toggleOf();

      await vi.waitFor(() => {
        expect(log).toHaveBeenCalledWith(expect.stringContaining('boom'));
      });
    });
  });

  describe('GIVEN a built toggle with a listener', () => {
    let toggle: ScriptsToggle;
    let unsubscribe: () => void;

    beforeEach(async () => {
      toggle = await builtToggle();
      unsubscribe = toggle.onDidChange(() => {
        calls.push('fire');
      });
    });

    it('WHEN set(true) runs THEN it stores true, sets the key, then fires once', async () => {
      await toggle.set(true);

      expect(calls).toStrictEqual(['update:true', 'setKey:true', 'fire']);
      expect(stored.get(KEY)).toBe(true);
    });

    it('WHEN set(true) runs THEN isShown reads true by the time the listener fires', async () => {
      const seen: boolean[] = [];

      toggle.onDidChange(() => {
        seen.push(toggle.isShown());
      });
      await toggle.set(true);

      expect(seen).toStrictEqual([true]);
    });

    it('WHEN two sets are in flight THEN they apply in order and the last decides', async () => {
      const firstStore = gateOf();

      updateGates.push(firstStore.promise);

      const showing = toggle.set(true);
      const hiding = toggle.set(false);

      await flush();
      firstStore.open();
      await Promise.all([showing, hiding]);

      expect(calls).toStrictEqual(['update:true', 'setKey:true', 'fire', 'update:false', 'setKey:false', 'fire']);
      expect(toggle.isShown()).toBe(false);
    });

    it('WHEN the store rejects THEN the failure is logged, set rejects and nothing fires', async () => {
      updateFailures.push(new Error('refused'));

      await expect(toggle.set(true)).rejects.toThrow('refused');

      expect(log).toHaveBeenCalledWith(expect.stringContaining('refused'));
      expect(calls).toStrictEqual([]);
      expect(toggle.isShown()).toBe(false);
    });

    it('WHEN a set failed THEN the next set still runs', async () => {
      updateFailures.push(new Error('refused'));

      await expect(toggle.set(true)).rejects.toThrow('refused');
      await toggle.set(true);

      expect(calls).toStrictEqual(['update:true', 'setKey:true', 'fire']);
      expect(toggle.isShown()).toBe(true);
    });

    it('WHEN the key cannot be set THEN the value stays stored, isShown and listeners stay unchanged and set rejects', async () => {
      setKey.mockRejectedValueOnce(new Error('refused'));

      await expect(toggle.set(true)).rejects.toThrow('refused');

      expect(stored.get(KEY)).toBe(true);
      expect(toggle.isShown()).toBe(false);
      expect(calls).toStrictEqual(['update:true']);
    });

    it('WHEN the listener is unsubscribed THEN set no longer fires it', async () => {
      unsubscribe();
      await toggle.set(true);

      expect(calls).toStrictEqual(['update:true', 'setKey:true']);
    });

    it('WHEN the toggle is disposed THEN set no longer fires the listener', async () => {
      toggle.dispose();
      await toggle.set(true);

      expect(calls).toStrictEqual(['update:true', 'setKey:true']);
    });
  });
});
