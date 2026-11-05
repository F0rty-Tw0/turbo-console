import { basename, dirname } from 'node:path';

import type { FolderCalls } from '../common/run-log-fs.type.ts';

export const folderCallsOf = (files: Map<string, Uint8Array>): FolderCalls => {
  const removed: string[] = [];
  const logs: string[] = [];
  const mtimes = new Map<string, number>();
  const madeDirs: string[] = [];
  const failures: unknown[] = [];

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

  const makeDir: FolderCalls['makeDir'] = async (dir) => {
    madeDirs.push(dir);

    if (failures.length > 0) return Promise.reject(failures[0]);

    return Promise.resolve();
  };

  const failMakeDir: FolderCalls['failMakeDir'] = (error) => {
    failures.push(error);
  };

  const log: FolderCalls['log'] = (line) => {
    logs.push(line);
  };

  const calls: FolderCalls = { removed, logs, mtimes, madeDirs, failMakeDir, remove, list, modifiedAt, makeDir, log };

  return calls;
};
