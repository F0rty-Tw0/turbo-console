import { vi } from 'vitest';

import type { RootFolder } from '../../../roots/common/root.type.ts';
import type { PickItem, PickerPorts } from '../../common/picker.type.ts';
import type { RunRequest } from '../../common/run.type.ts';
import type { PickerFakes } from '../common/picker-fakes.type.ts';

/** Picker ports where every root loads at once, `rootOf` finds the folder holding a path, and `choose` answers picks. */
export const pickerFakes = (folders: RootFolder[]): PickerFakes => {
  const chosen: string[] = [];
  const ensureLoaded = vi.fn<(root: string) => Promise<void>>().mockResolvedValue(undefined);
  const pick = vi.fn<(items: PickItem[], placeholder: string) => Promise<PickItem | undefined>>(async (items) => {
    const value = chosen.shift();
    const found = items.find((item) => item.value === value);

    return Promise.resolve(found);
  });
  const info = vi.fn<(text: string) => void>();
  const run = vi.fn<(request: RunRequest) => Promise<void>>().mockResolvedValue(undefined);
  const scriptsShown = vi.fn<() => boolean>().mockReturnValue(false);
  const rootOf = (file: string): string | null => {
    const lower = file.toLowerCase();
    const holding = folders.find((folder) => lower.startsWith(`${folder.root.toLowerCase()}/`));

    return holding?.root ?? null;
  };
  const choose = (...values: string[]): void => {
    chosen.push(...values);
  };
  const ports: PickerPorts = { ensureLoaded, rootOf, pick, info, run, scriptsShown };
  const fakes: PickerFakes = { ports, ensureLoaded, pick, info, run, scriptsShown, choose };

  return fakes;
};
