import { basename, dirname } from 'node:path';

import type { FolderCalls } from '../common/run-log-fs.type.ts';

export const folderCallsOf = (files: Map<string, Uint8Array>): FolderCalls => {
  const removed: string[] = [];
  const logs: string[] = [];
  const mtimes = new Map<string, number>();

  const remove: FolderCalls['remove'] = async (path) => {
    files.delete(path);
    removed.push(path);

    return Promise.resolve();
  };

  const list: FolderCalls['list'] = async (dir) => {
    const keys = files.keys();
    const paths = [...keys];
    const inDir = paths.filter((path) => dirname(path) === dir);

    return Promise.resolve(inDir.map((path) => basename(path)));
  };

  const modifiedAt: FolderCalls['modifiedAt'] = async (path) => Promise.resolve(mtimes.get(path) ?? null);

  const log: FolderCalls['log'] = (line) => {
    logs.push(line);
  };

  const calls: FolderCalls = { removed, logs, mtimes, remove, list, modifiedAt, log };

  return calls;
};
