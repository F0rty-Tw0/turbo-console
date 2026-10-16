import type { Mock } from 'vitest';

/** `ScriptsToggleApi` with every member a spy; `listeners` is the set `onDidChange` fills. */
export type ScriptsToggleFake = {
  readonly isShown: Mock<() => boolean>;
  readonly set: Mock<(value: boolean) => Promise<void>>;
  readonly onDidChange: Mock<(listener: () => void) => () => void>;
  readonly listeners: Set<() => void>;
};
