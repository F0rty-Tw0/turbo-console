import type { Mock } from 'vitest';

import type { PickItem, PickerPorts } from '../../common/picker.type.ts';
import type { RunRequest } from '../../common/run.type.ts';

export type PickerFakes = {
  readonly ports: PickerPorts;
  readonly ensureLoaded: Mock<(root: string) => Promise<void>>;
  readonly pick: Mock<(items: PickItem[], placeholder: string) => Promise<PickItem | undefined>>;
  readonly info: Mock<(text: string) => void>;
  readonly run: Mock<(request: RunRequest) => Promise<void>>;
  /** The scripts toggle as the pickers read it; hidden until a case answers `true`. */
  readonly scriptsShown: Mock<() => boolean>;
  /** The values the next picks choose, in order; a pick whose value is not offered (or none left) is closed. */
  readonly choose: (...values: string[]) => void;
};
