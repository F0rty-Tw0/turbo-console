import { join } from 'node:path';

import type { PackageImportScan } from '@turbo-console/core';
import type { EdgeImportsResult, GraphPackageModulesMessage, GraphState, ImportSite, ModulesFound, ModulesResult } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ImportScans } from './import-scans.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { importScanOf, scannedFileOf, sourceImportOf } from '../test/utils/import-scan.spec.util.ts';
import { importsReplyOf, pendingScanOf, postedOf, scanInputsOf, scansGateOf } from '../test/utils/import-scans.spec.util.ts';

const WEB_DIR = join(IMPORT_ROOT, 'apps', 'web');
const A_DIR = join(IMPORT_ROOT, 'packages', 'a');
const X_DIR = join(IMPORT_ROOT, 'packages', 'libs', 'x');
const WEB_MANIFEST = join(WEB_DIR, 'package.json');
const IMPORTS_A = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a', 0)])]);
const SITE_OF_A: ImportSite = {
  file: 'src/x.ts',
  line: 0,
  specifier: 'a',
  text: "import x from 'a';",
  kind: 'static',
  isType: false,
  via: 'name'
};
const FOUND_A: EdgeImportsResult = { kind: 'found', scanned: 1, skipped: 0, total: 1, sites: [SITE_OF_A], limit: null };
const WEB_TO_A = importsReplyOf('web', 'a', FOUND_A);
const NO_COUNTS = { unresolved: 0, external: 0, assets: 0, self: 0 };
const FOUND_WEB: ModulesFound = {
  kind: 'found',
  files: ['src/x.ts'],
  tests: [],
  stubs: ['a'],
  fileLinks: [],
  stubLinks: [[0, 0, 1, 0, 0]],
  counts: NO_COUNTS,
  scanned: 1,
  skipped: 0,
  limit: null,
  dropped: 0
};
const MODULES_WEB: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FOUND_WEB };
const FAILED_RESULT: ModulesResult = { kind: 'failed' };
const LOADING: GraphState = { kind: 'loading' };
const FAILED_WEB: GraphPackageModulesMessage = { type: 'packageModules', packageName: 'web', result: FAILED_RESULT };
const FOUND_KIND = { kind: 'found' };
const MODULES_OF_A = { type: 'packageModules', packageName: 'a', result: FOUND_KIND };

describe('FEATURE: modules asks of the import scans of one panel', () => {
  let ports: GraphPorts;
  let canPost: Mock<() => boolean>;
  let state: GraphState;
  let scans: ImportScans;

  beforeEach(() => {
    ports = graphPortsMock();
    canPost = vi.fn<() => boolean>(() => true);
    state = GRAPH_STATE_STUB;
    scans = new ImportScans(scansGateOf(ports, { canPost, state: () => state }));
  });

  describe('GIVEN an idle queue', () => {
    it('WHEN web modules are asked THEN apps/web is scanned with the others skipped and one packageModules is posted', async () => {
      vi.mocked(ports.scanImports).mockResolvedValue(IMPORTS_A);

      await scans.askModules('web');

      expect(scanInputsOf(ports)[0]).toMatchObject({ dir: WEB_DIR, skipDirs: new Set([A_DIR, X_DIR]) });
      expect(ports.readText).toHaveBeenCalledWith(WEB_MANIFEST);
      expect(postedOf(ports)).toStrictEqual([MODULES_WEB]);
    });

    it.each([
      ['an unlisted package', 'ghost', GRAPH_STATE_STUB],
      ["a state that is not a graph ({ kind: 'loading' })", 'web', LOADING]
    ])('WHEN %s is asked THEN failed is posted at once and nothing is scanned', async (_label, packageName, now) => {
      state = now;

      await scans.askModules(packageName);

      expect(postedOf(ports)).toStrictEqual([{ type: 'packageModules', packageName, result: FAILED_RESULT }]);
      expect(ports.scanImports).not.toHaveBeenCalled();
    });

    it('WHEN an unlisted package is asked while the panel cannot post THEN nothing is posted', async () => {
      canPost.mockReturnValue(false);

      await scans.askModules('ghost');

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN the scan rejects with EMFILE THEN failed is posted and the error is logged once', async () => {
      vi.mocked(ports.scanImports).mockRejectedValue(new Error('EMFILE'));

      await scans.askModules('web');

      expect(postedOf(ports)).toStrictEqual([FAILED_WEB]);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('EMFILE'));
    });

    it('WHEN answering the scan throws THEN failed is posted and the error is logged', async () => {
      const empty = importScanOf([]);
      const throwing: PackageImportScan = {
        ...empty,
        get walkedFiles(): string[] {
          throw new Error('boom');
        }
      };

      vi.mocked(ports.scanImports).mockResolvedValue(throwing);
      await scans.askModules('web');

      expect(postedOf(ports)).toStrictEqual([FAILED_WEB]);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('boom'));
    });

    it('WHEN the post throws THEN the error is logged and the ask still resolves', async () => {
      vi.mocked(ports.post).mockImplementation(() => {
        throw new Error('closed');
      });

      await scans.askModules('web');

      expect(ports.log).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('closed'));
    });

    it('WHEN web modules are asked again after the scan settled THEN it scans again', async () => {
      await scans.askModules('web');
      await scans.askModules('web');

      expect(ports.scanImports).toHaveBeenCalledTimes(2);
    });

    it('WHEN disposed before the ask THEN nothing is scanned or posted', async () => {
      scans.dispose();

      await scans.askModules('web');

      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a modules scan of web in flight', () => {
    let pending: PromiseWithResolvers<PackageImportScan>;
    let first: Promise<void>;

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = scans.askModules('web');
    });

    it('WHEN web modules are asked again THEN it joins: one scan and one post', async () => {
      const second = scans.askModules('web');

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(postedOf(ports)).toStrictEqual([MODULES_WEB]);
    });

    it("WHEN a modules are asked THEN web's signal is aborted, nothing is posted for web and a's packageModules is posted", async () => {
      const second = scans.askModules('a');
      const [webInput] = scanInputsOf(ports);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(webInput?.signal.aborted).toBe(true);
      expect(postedOf(ports)).toMatchObject([MODULES_OF_A]);
    });

    it('WHEN web stops being listed before the scan resolves THEN nothing is posted', async () => {
      const packages = GRAPH_STATE_STUB.packages.filter((pkg) => pkg.name !== 'web');

      state = { ...GRAPH_STATE_STUB, packages };
      pending.resolve(IMPORTS_A);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN the panel cannot post when the scan resolves THEN nothing is posted', async () => {
      canPost.mockReturnValue(false);
      pending.resolve(IMPORTS_A);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN disposed THEN the signal is aborted and nothing is posted after the scan resolves anyway', async () => {
      const [input] = scanInputsOf(ports);

      scans.dispose();
      pending.resolve(IMPORTS_A);
      await first;

      expect(input?.signal.aborted).toBe(true);
      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an edge scan of web → a in flight', () => {
    let pending: PromiseWithResolvers<PackageImportScan>;
    let first: Promise<boolean>;

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = scans.ask('web', 'a');
    });

    it('WHEN web modules are asked THEN both join one scan and post in settle order', async () => {
      const second = scans.askModules('web');

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(postedOf(ports)).toStrictEqual([WEB_TO_A, MODULES_WEB]);
    });

    it("WHEN a modules are asked THEN no edgeImports is posted and a's packageModules is", async () => {
      const second = scans.askModules('a');

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(postedOf(ports)).toMatchObject([MODULES_OF_A]);
    });
  });
});
