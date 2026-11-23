import type { ModuleEnd } from '../../bridge/common/graph-module-sites.type.ts';
import { DIR_PREFIX, FILE_PREFIX, STUB_PREFIX } from '../common/graph-module.const.ts';

/** The end a scene id names: `file:` → a file, `dir:` → a folder, else (`pkg:`) a stub; the prefix is cut once. */
export const endOf = (id: string): ModuleEnd => {
  const isFile = id.startsWith(FILE_PREFIX);
  const isDir = id.startsWith(DIR_PREFIX);

  if (isFile) {
    const file: ModuleEnd = { kind: 'file', path: id.slice(FILE_PREFIX.length) };

    return file;
  }

  if (isDir) {
    const dir: ModuleEnd = { kind: 'dir', path: id.slice(DIR_PREFIX.length) };

    return dir;
  }

  const stub: ModuleEnd = { kind: 'stub', name: id.slice(STUB_PREFIX.length) };

  return stub;
};
