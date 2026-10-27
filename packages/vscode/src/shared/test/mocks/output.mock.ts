import { vi } from 'vitest';

import type { Output } from '../../common/output.type.ts';

/** An `Output` whose every member is a spy. */
export const outputMock = (): Output => {
  const output: Output = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn(), dispose: vi.fn() };

  return output;
};
