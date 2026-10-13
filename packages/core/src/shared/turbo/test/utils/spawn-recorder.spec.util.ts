import type { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/**
 * Wraps `execFile` so each callback-form call pushes its `file` onto `files` before spawning. `promisify` of the
 * wrapper still resolves `{ stdout, stderr }`, through the real `execFile`'s custom form, so promisified calls are not
 * recorded (core spawns turbo through the callback form only).
 */
export const recordingExecFile = (real: typeof execFile, files: string[]): typeof execFile => {
  const wrapper = (file: string, ...rest: unknown[]): unknown => {
    files.push(file);

    return Reflect.apply(real, undefined, [file, ...rest]);
  };

  // Node defines execFile's promisify.custom at runtime; @types/node does not declare it (TS7053 on `real[promisify.custom]`).
  const custom: unknown = Reflect.get(real, promisify.custom);

  Object.defineProperty(wrapper, promisify.custom, { value: custom });

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- execFile's overloads cannot be re-declared by a wrapper.
  return wrapper as typeof execFile;
};
