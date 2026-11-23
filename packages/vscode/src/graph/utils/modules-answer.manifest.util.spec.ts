import { join } from 'node:path';

import { parseTree } from 'jsonc-parser';
import { describe, expect, it, vi } from 'vitest';

import { answerModules } from './modules-answer.util.ts';
import type { ModulesContext } from '../common/import-match.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { GRAPH_INFOS_STUB } from '../test/stubs/graph-model.stub.ts';
import { importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';

vi.mock(import('jsonc-parser'), async (importOriginal) => {
  const actual = await importOriginal();
  const spied = { ...actual, parseTree: vi.fn(actual.parseTree) };

  return spied;
});

const MANIFEST = '{"name":"web","dependencies":{"a-alias":"workspace:a@*"}}';

const WEB_CTX: ModulesContext = {
  root: IMPORT_ROOT,
  packageName: 'web',
  dir: join(IMPORT_ROOT, 'apps', 'web'),
  packages: GRAPH_INFOS_STUB,
  manifestText: MANIFEST
};

const X_IMPORTS_ALIAS = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a-alias', 0)])]);

describe('FEATURE: modules answer over the package manifest', () => {
  describe(`GIVEN web's manifest aliasing a and ${GRAPH_INFOS_STUB.length - 1} other listed packages`, () => {
    it('WHEN src/x.ts imports the alias THEN it links to the stub a', () => {
      const result = answerModules(X_IMPORTS_ALIAS, WEB_CTX);

      expect(result).toMatchObject({ stubs: ['a'], stubLinks: [[0, 0, 1, 0, 0]] });
    });

    it('WHEN the answer is built THEN the manifest is parsed once, not once per other package', () => {
      vi.mocked(parseTree).mockClear();

      answerModules(X_IMPORTS_ALIAS, WEB_CTX);

      expect(parseTree).toHaveBeenCalledOnce();
    });
  });
});
