import { vi } from 'vitest';

import type { RootEntry, Roots } from '../../common/coordinator.type.ts';

/** A `Roots` whose `get` reads `entries`; `all` and `onDidChange` are bare spies. */
export const rootsMock = (entries: ReadonlyMap<string, RootEntry>): Roots => {
  const get = (root: string): RootEntry | undefined => entries.get(root);
  const roots: Roots = { get, all: vi.fn(), onDidChange: vi.fn() };

  return roots;
};
