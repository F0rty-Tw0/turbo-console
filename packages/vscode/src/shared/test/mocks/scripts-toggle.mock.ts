import { vi } from 'vitest';

import type { ScriptsToggleFake } from '../common/scripts-toggle-fake.type.ts';

/** The one `ScriptsToggleApi` fake: `set` stores the value and fires the listeners, as the real toggle does. */
export const scriptsToggleMock = (shown = false): ScriptsToggleFake => {
  const listeners = new Set<() => void>();
  let value = shown;
  const isShown = vi.fn(() => value);
  const set = vi.fn(async (next: boolean): Promise<void> => {
    value = next;

    for (const listener of listeners) listener();

    return Promise.resolve();
  });
  const onDidChange = vi.fn((listener: () => void): (() => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  });
  const fake: ScriptsToggleFake = { isShown, set, onDidChange, listeners };

  return fake;
};
