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

  it('WHEN the scan rejects with an error (not an abort) THEN failed is posted for each joined ask and the error is logged once', async () => {
    const pending = pendingScanOf(ports);
    const first = scans.ask('web', 'a');
    const second = scans.ask('web', '@org/x');

    pending.reject(new Error('EMFILE'));
    await Promise.all([first, second]);

    expect(postedOf(ports)).toStrictEqual([
      importsReplyOf('web', 'a', { kind: 'failed' }),
      importsReplyOf('web', '@org/x', { kind: 'failed' })
    ]);
    expect(ports.log).toHaveBeenCalledTimes(1);
    expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('EMFILE'));
  });

  it('WHEN answerImports throws for web → a THEN failed is posted for it, the error logged, and web → @org/x is still answered', async () => {
    const pending = pendingScanOf(ports);

    vi.mocked(answerImports).mockImplementationOnce(() => {
      throw new Error('boom');
    });

    const first = scans.ask('web', 'a');
    const second = scans.ask('web', '@org/x');

    pending.resolve(importScanOf([]));
    await Promise.all([first, second]);

    expect(postedOf(ports)).toStrictEqual([
      importsReplyOf('web', 'a', { kind: 'failed' }),
      importsReplyOf('web', '@org/x', { kind: 'none', scanned: 0, skipped: 0, limit: null })
    ]);
    expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
