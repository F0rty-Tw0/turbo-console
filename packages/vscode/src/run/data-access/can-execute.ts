import { access, constants } from 'node:fs/promises';

/** Windows has no execute bit, so an existing file counts there. */
const MODE = process.platform === 'win32' ? constants.F_OK : constants.X_OK;

export const canExecute = async (binaryPath: string): Promise<boolean> => {
  try {
    await access(binaryPath, MODE);

    return true;
  } catch {
    return false;
  }
};
