import { vi } from 'vitest';

import type { AffectedListener, SharedAffected } from '../../common/affected.type.ts';
import type { SharedAffectedFake } from '../common/shared-affected-fake.type.ts';

/** The one `SharedAffected` fake: every member a spy, and `emit(root)` calls the listeners `onDidChange` collected. */
export const sharedAffectedMock = (): SharedAffectedFake => {
  const listeners = new Set<AffectedListener>();
  const onDidChange = vi.fn((listener: AffectedListener): (() => void) => {
    listeners.add(listener);

    return (): void => {
      listeners.delete(listener);
    };
  });
  const emit: AffectedListener = (root) => {
    for (const listener of listeners) listener(root);
  };
  const shared: SharedAffected = {
    view: vi.fn(() => null),
    status: vi.fn<SharedAffected['status']>(() => 'absent'),
    rootShown: vi.fn(),
    toggled: vi.fn(),
    modelChanged: vi.fn(),
    rootsKept: vi.fn(),
    dispose: vi.fn(),
    onDidChange
  };
  const fake: SharedAffectedFake = { ...shared, emit };

  return fake;
};
