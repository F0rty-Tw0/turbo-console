import { describe, expect, it, vi } from 'vitest';

import { RunLogTails } from './run-log-tails.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { ROOT_OTHER, ROOT_WS } from '../test/common/run-log-tails.const.ts';
import { fakeLogFs } from '../test/utils/run-log-fs.spec.util.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';
import { runLogDirErrorText } from '../utils/run-text.util.ts';

const DIR_WS = runLogDirOf(ROOT_WS);

describe('FEATURE: the log folder before a run (spec D6)', () => {
  describe('GIVEN a root whose folder can be made', () => {
    it('WHEN prepared THEN /ws/.turbo/turbo-console is made and the answer is true', async () => {
      const fs = fakeLogFs();
      const tails = new RunLogTails(fs.ports);

      const isReady = await tails.prepare(ROOT_WS);

      expect([isReady, fs.madeDirs]).toStrictEqual([true, [DIR_WS]]);
    });

    it('WHEN prepared twice THEN the folder is made twice (one deleted between runs comes back) and nothing is logged', async () => {
      const fs = fakeLogFs();
      const tails = new RunLogTails(fs.ports);

      await tails.prepare(ROOT_WS);
      await tails.prepare(ROOT_WS);

      expect([fs.madeDirs, fs.logs]).toStrictEqual([[DIR_WS, DIR_WS], []]);
    });
  });

  describe('GIVEN folders that cannot be made', () => {
    const failure = new Error('EACCES');

    it('WHEN /ws is prepared THEN the answer is false and one line names the folder and the reason', async () => {
      const fs = fakeLogFs();
      const tails = new RunLogTails(fs.ports);

      fs.failMakeDir(failure);
      const isReady = await tails.prepare(ROOT_WS);

      expect([isReady, fs.logs]).toStrictEqual([false, [runLogDirErrorText(DIR_WS, failure)]]);
    });

    it('WHEN /ws is prepared again and /other too THEN still one line in the session', async () => {
      const fs = fakeLogFs();
      const tails = new RunLogTails(fs.ports);

      fs.failMakeDir(failure);
      await tails.prepare(ROOT_WS);
      await tails.prepare(ROOT_WS);
      await tails.prepare(ROOT_OTHER);

      expect(fs.logs).toHaveLength(1);
    });

    it('WHEN prepared THEN no watcher opens and no listing is swept', async () => {
      const fs = fakeLogFs();
      const list = vi.fn(fs.ports.list);
      const ports: RunLogPorts = { ...fs.ports, list };
      const tails = new RunLogTails(ports);

      fs.failMakeDir(failure);
      await tails.prepare(ROOT_WS);

      expect(fs.watchers).toStrictEqual([]);
      expect(list).not.toHaveBeenCalled();
    });
  });
});
