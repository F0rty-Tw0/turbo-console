import { spawn } from 'node:child_process';
import { once } from 'node:events';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { rssOf } from './rss-probe.ts';
import type { RssDeps } from '../common/turbo.type.ts';

type Exec = RssDeps['exec'];

const unusedReadFile = vi.fn<RssDeps['readFile']>().mockRejectedValue(new Error('readFile must not be called'));

const execReturning = (stdout: string): Exec => {
  return (_file, _args, _options, callback) => {
    callback(null, stdout);
  };
};

const execFailing = (error: Error): Exec => {
  return (_file, _args, _options, callback) => {
    callback(error, '');
  };
};

const depsFor = (platform: NodeJS.Platform, exec: Exec): RssDeps => {
  const deps: RssDeps = { platform, exec, readFile: unusedReadFile };

  return deps;
};

const deadPid = async (): Promise<number> => {
  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' });
  const pid = child.pid ?? 0;

  await once(child, 'exit');

  return pid;
};

describe('FEATURE: resident memory of a process', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GIVEN the current process and the default probe', () => {
    it('WHEN its memory is read THEN it is within 0.25x to 4x of process.memoryUsage().rss', async () => {
      const expected = process.memoryUsage().rss;

      const rss = await rssOf(process.pid);

      expect(rss).toBeGreaterThan(expected * 0.25);
      expect(rss).toBeLessThan(expected * 4);
    });
  });

  describe('GIVEN a pid whose process has exited', () => {
    it('WHEN its memory is read THEN it resolves null', async () => {
      const pid = await deadPid();

      const rss = await rssOf(pid);

      expect(rss).toBeNull();
    });
  });

  describe('GIVEN linux', () => {
    it('WHEN /proc/<pid>/status is read THEN its VmRSS is returned in bytes', async () => {
      const readFile = vi.fn<RssDeps['readFile']>().mockResolvedValue('Name:\tnode\nVmRSS:\t   2048 kB\n');

      const rss = await rssOf(42, { platform: 'linux', exec: execReturning(''), readFile });

      expect(readFile).toHaveBeenCalledWith('/proc/42/status', 'utf8');
      expect(rss).toBe(2097152);
    });

    it('WHEN the read rejects with ENOENT THEN it resolves null', async () => {
      const readFile = vi.fn<RssDeps['readFile']>().mockRejectedValue(Object.assign(new Error('gone'), { code: 'ENOENT' }));

      const rss = await rssOf(42, { platform: 'linux', exec: execReturning(''), readFile });

      expect(rss).toBeNull();
    });
  });

  describe('GIVEN a platform without a probe of its own', () => {
    it('WHEN its memory is read THEN procfs is used', async () => {
      const readFile = vi.fn<RssDeps['readFile']>().mockResolvedValue('VmRSS:\t1 kB\n');

      const rss = await rssOf(7, { platform: 'freebsd', exec: execReturning(''), readFile });

      expect(readFile).toHaveBeenCalledWith('/proc/7/status', 'utf8');
      expect(rss).toBe(1024);
    });
  });

  describe('GIVEN darwin', () => {
    it('WHEN ps prints the rss in kB THEN it is returned in bytes', async () => {
      const exec = vi.fn<Exec>(execReturning(' 100\n'));

      const rss = await rssOf(42, depsFor('darwin', exec));

      expect(exec).toHaveBeenCalledWith(
        '/bin/ps',
        ['-o', 'rss=', '-p', '42'],
        { encoding: 'utf8', timeout: 2000, maxBuffer: 65536 },
        expect.any(Function)
      );
      expect(rss).toBe(102400);
    });

    it('WHEN ps prints nothing parseable THEN it resolves null', async () => {
      const exec = execReturning('\n');

      const rss = await rssOf(42, depsFor('darwin', exec));

      expect(rss).toBeNull();
    });

    it('WHEN ps times out THEN it resolves null', async () => {
      const exec = execFailing(Object.assign(new Error('timed out'), { killed: true }));

      const rss = await rssOf(42, depsFor('darwin', exec));

      expect(rss).toBeNull();
    });

    it('WHEN ps fails for another reason THEN it resolves null', async () => {
      const exec = execFailing(Object.assign(new Error('exit 1'), { code: 1 }));

      const rss = await rssOf(42, depsFor('darwin', exec));

      expect(rss).toBeNull();
    });
  });

  describe('GIVEN win32 with SystemRoot unset', () => {
    it('WHEN tasklist prints the pid row THEN tasklist runs from the default System32 and the bytes are returned', async () => {
      vi.stubEnv('SystemRoot', undefined);
      const exec = vi.fn<Exec>(execReturning('"node.exe","42","Console","1","12,345 K"\r\n'));

      const rss = await rssOf(42, depsFor('win32', exec));

      expect(exec).toHaveBeenCalledWith(
        'C:\\Windows\\System32\\tasklist.exe',
        ['/FI', 'PID eq 42', '/FO', 'CSV', '/NH'],
        { encoding: 'utf8', windowsHide: true, timeout: 2000, maxBuffer: 65536 },
        expect.any(Function)
      );
      expect(rss).toBe(12641280);
    });

    it('WHEN tasklist fails THEN it resolves null', async () => {
      const exec = execFailing(Object.assign(new Error('timed out'), { killed: true }));

      const rss = await rssOf(42, depsFor('win32', exec));

      expect(rss).toBeNull();
    });
  });
});
