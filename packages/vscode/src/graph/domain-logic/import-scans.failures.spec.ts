import type { PackageImportScan } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImportScans } from './import-scans.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { importScanOf } from '../test/utils/import-scan.spec.util.ts';
import { importsReplyOf, pendingScanOf, postedOf, scansGateOf } from '../test/utils/import-scans.spec.util.ts';
import { answerImports } from '../utils/import-answer.util.ts';
import type * as importAnswer from '../utils/import-answer.util.ts';

vi.mock('../utils/import-answer.util.ts', async (importOriginal) => {
  const original = await importOriginal<typeof importAnswer>();
  const mocked = { ...original, answerImports: vi.fn(original.answerImports) };

  return mocked;
});

describe('FEATURE: import scan failures', () => {
  let ports: GraphPorts;
  let scans: ImportScans;

  beforeEach(() => {
    ports = graphPortsMock();
    scans = new ImportScans(scansGateOf(ports));
  });

  describe('GIVEN a scan of web in flight', () => {
    let pending: PromiseWithResolvers<PackageImportScan>;
    let first: Promise<boolean>;
    let second: Promise<boolean>;

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = scans.ask('web', 'a');
      second = scans.ask('web', '@org/x');
    });

    it('WHEN the scan rejects with an error (not an abort) THEN failed is posted for each joined ask and the error is logged once', async () => {
      pending.reject(new Error('EMFILE'));
      await Promise.all([first, second]);

      expect(postedOf(ports)).toStrictEqual([
        importsReplyOf('web', 'a', { kind: 'failed' }),
        importsReplyOf('web', '@org/x', { kind: 'failed' })
      ]);
      expect(ports.log).toHaveBeenCalledTimes(1);
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('EMFILE'));
    });

    it('WHEN the scan rejects and the log throws THEN both asks resolve true and web → a is scanned afresh, not joined to the dead run', async () => {
      vi.mocked(ports.log).mockImplementation(() => {
        throw new Error('log is gone');
      });
      pending.reject(new Error('EMFILE'));

      const answered = await Promise.all([first, second]);
      const isAnsweredAgain = await scans.ask('web', 'a');

      expect(answered).toStrictEqual([true, true]);
      expect(isAnsweredAgain).toBe(true);
      expect(ports.scanImports).toHaveBeenCalledTimes(2);
    });

    it('WHEN answerImports throws for web → a THEN failed is posted for it, the error logged, and web → @org/x is still answered', async () => {
      vi.mocked(answerImports).mockImplementationOnce(() => {
        throw new Error('boom');
      });
      pending.resolve(importScanOf([]));
      await Promise.all([first, second]);

      expect(postedOf(ports)).toStrictEqual([
        importsReplyOf('web', 'a', { kind: 'failed' }),
        importsReplyOf('web', '@org/x', { kind: 'none', scanned: 0, skipped: 0, limit: null })
      ]);
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });

    it('WHEN the post throws THEN both asks still resolve true and the error is logged', async () => {
      vi.mocked(ports.post).mockImplementation(() => {
        throw new Error('EPIPE');
      });
      pending.resolve(importScanOf([]));

      const answered = await Promise.all([first, second]);

      expect(answered).toStrictEqual([true, true]);
      expect(ports.log).toHaveBeenCalledTimes(2);
      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('EPIPE'));
    });
  });
});
