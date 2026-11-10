import { vi } from 'vitest';

import type { ScriptsTogglePorts } from '../../common/scripts-toggle.type.ts';

/** `StoredToggle` ports whose store reads `stored` for every key; `update`, `setKey` and `log` are resolved spies. */
export const togglePortsMock = (stored: unknown): ScriptsTogglePorts => {
  const get = (): unknown => stored;
  const store = { get, update: vi.fn(async () => Promise.resolve()) };
  const ports: ScriptsTogglePorts = { store, setKey: vi.fn(async () => Promise.resolve()), log: vi.fn() };

  return ports;
};
