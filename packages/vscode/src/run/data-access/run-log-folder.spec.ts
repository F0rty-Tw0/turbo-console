import { describe, expect, it } from 'vitest';

import { prepareRunLogDir } from './run-log-folder.ts';
import { ROOT_WS } from '../test/common/run-log-tails.const.ts';
import { fakeLogFs } from '../test/utils/run-log-fs.spec.util.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';
import { runLogDirErrorText } from '../utils/run-text.util.ts';

const DIR_WS = runLogDirOf(ROOT_WS);

describe('FEATURE: preparing the log folder of a root (spec D6)', () => {
  describe('GIVEN a folder that can be made', () => {
    it('WHEN prepared THEN the folder is made, the answer is true and nothing is handed to logOnce', async () => {
      const fs = fakeLogFs();
      const lines: string[] = [];

      const isReady = await prepareRunLogDir(fs.ports, ROOT_WS, (line) => lines.push(line));

      expect([isReady, fs.madeDirs, lines]).toStrictEqual([true, [DIR_WS], []]);
    });
  });

  describe('GIVEN a folder that cannot be made', () => {
    it('WHEN prepared THEN the answer is false and logOnce gets the folder text of the failure', async () => {
      const fs = fakeLogFs();
      const failure = new Error('EACCES');
      const lines: string[] = [];

      fs.failMakeDir(failure);
      const isReady = await prepareRunLogDir(fs.ports, ROOT_WS, (line) => lines.push(line));

      expect([isReady, lines]).toStrictEqual([false, [runLogDirErrorText(DIR_WS, failure)]]);
    });
  });
});
