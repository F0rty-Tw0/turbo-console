import type { FileHandle, open } from 'node:fs/promises';

import type { CloseFault } from '../common/fake-turbo.type.ts';

/**
 * Wraps `open` so that, once `fault.failNext` is set, the next opened handle's `close()` really closes and then rejects
 * with a path-less error, as a `FileHandle` close failure does.
 */
export const faultyCloseOpen = (real: typeof open, fault: CloseFault): typeof open => {
  const wrapper = async (...args: Parameters<typeof open>): Promise<FileHandle> => {
    const handle = await real(...args);

    if (!fault.failNext) return handle;

    fault.failNext = false;
    const realClose = handle.close.bind(handle);

    const failingClose = async (): Promise<void> => {
      await realClose();

      throw new Error('close failed');
    };

    Reflect.set(handle, 'close', failingClose);

    return handle;
  };

  return wrapper;
};
