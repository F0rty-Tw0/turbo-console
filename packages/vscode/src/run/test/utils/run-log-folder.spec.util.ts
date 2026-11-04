import type { FolderCalls } from '../common/run-log-fs.type.ts';

export const folderCallsOf = (files: Map<string, Uint8Array>): FolderCalls => {
  const removed: string[] = [];
  const logs: string[] = [];

  const remove: FolderCalls['remove'] = async (path) => {
    files.delete(path);
    removed.push(path);

    return Promise.resolve();
  };

  const log: FolderCalls['log'] = (line) => {
    logs.push(line);
  };

  const calls: FolderCalls = { removed, logs, remove, log };

  return calls;
};
