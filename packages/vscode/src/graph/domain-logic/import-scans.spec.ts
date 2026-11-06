import { join } from 'node:path';

import type { EdgeImportsResult, GraphState, ImportSite } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { ImportScans } from './import-scans.ts';
import type { GraphPorts } from '../common/graph.type.ts';
import { IMPORT_ROOT } from '../test/common/import-edge.const.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { GRAPH_STATE_STUB } from '../test/stubs/graph-model.stub.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';
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
const NONE_OF_ONE: EdgeImportsResult = { kind: 'none', scanned: 1, skipped: 0, limit: null };
const NONE_OF_ZERO: EdgeImportsResult = { kind: 'none', scanned: 0, skipped: 0, limit: null };
const WEB_TO_A = importsReplyOf('web', 'a', FOUND_A);
const WEB_TO_X = importsReplyOf('web', '@org/x', NONE_OF_ONE);
const A_TO_X = importsReplyOf('a', '@org/x', NONE_OF_ZERO);
const ROOT_PACKAGES = [...GRAPH_STATE_STUB.packages, graphPackageOf('r', '')];
const ROOT_EDGES = [...GRAPH_STATE_STUB.edges, { source: 'web', target: 'r' }];
const ROOT_STATE: GraphState = { ...GRAPH_STATE_STUB, packages: ROOT_PACKAGES, edges: ROOT_EDGES };
const COLLIDING_PACKAGES = [
  ...GRAPH_STATE_STUB.packages,
  graphPackageOf('a|b', 'packages/a'),
  graphPackageOf('c', 'packages/c'),
  graphPackageOf('b|c', 'packages/bc')
];
const COLLIDING_EDGES = [...GRAPH_STATE_STUB.edges, { source: 'a|b', target: 'c' }, { source: 'a', target: 'b|c' }];
const COLLIDING_STATE: GraphState = { ...GRAPH_STATE_STUB, packages: COLLIDING_PACKAGES, edges: COLLIDING_EDGES };

describe('FEATURE: import scans of one panel', () => {
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
    it("WHEN web → a is asked THEN web's package.json is read, apps/web is scanned with the other packages skipped, and the found site is posted", async () => {
      vi.mocked(ports.scanImports).mockResolvedValue(IMPORTS_A);

      const isAnswered = await scans.ask('web', 'a');
      const [input] = scanInputsOf(ports);

      expect(isAnswered).toBe(true);
      expect(ports.readText).toHaveBeenCalledWith(WEB_MANIFEST);
      expect(input).toMatchObject({ dir: WEB_DIR, root: IMPORT_ROOT, skipDirs: new Set([A_DIR, X_DIR]) });
      expect(input?.signal.aborted).toBe(false);
      expect(postedOf(ports)).toStrictEqual([WEB_TO_A]);
    });

    it.each([
      ['an unknown source', 'ghost', 'a'],
      ['an unknown target', 'web', 'ghost'],
      ['an unlisted edge', 'a', 'web']
    ])('WHEN %s is asked THEN it is false and nothing is read or scanned', async (_title, source, target) => {
      const isAnswered = await scans.ask(source, target);

      expect(isAnswered).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.scanImports).not.toHaveBeenCalled();
    });

    it("WHEN the state is not a graph ({ kind: 'loading' }) THEN it is false and nothing is read", async () => {
      state = { kind: 'loading' };

      const isAnswered = await scans.ask('web', 'a');

      expect(isAnswered).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });

    it('WHEN two edges are asked one after the other THEN both scans get the same cache object', async () => {
      await scans.ask('web', 'a');
      await scans.ask('a', '@org/x');

      const caches = scanInputsOf(ports).map((input) => input.cache);

      expect(caches).toHaveLength(2);
      expect(caches[1]).toBe(caches[0]);
    });

    it('WHEN web → a is asked again after its scan settled THEN it scans again instead of joining', async () => {
      await scans.ask('web', 'a');
      await scans.ask('web', 'a');

      expect(ports.scanImports).toHaveBeenCalledTimes(2);
    });

    it('WHEN disposed before an ask THEN it is true and nothing is read, scanned or posted', async () => {
      scans.dispose();

      const isAnswered = await scans.ask('web', 'a');

      expect(isAnswered).toBe(true);
      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.scanImports).not.toHaveBeenCalled();
      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a scan of web in flight', () => {
    let pending: PromiseWithResolvers<typeof IMPORTS_A>;
    let first: Promise<boolean>;

    beforeEach(() => {
      pending = pendingScanOf(ports);
      first = scans.ask('web', 'a');
    });

    it('WHEN web → @org/x is asked THEN it joins: one scan, and replies for web → a and web → @org/x are posted', async () => {
      const second = scans.ask('web', '@org/x');

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(postedOf(ports)).toStrictEqual([WEB_TO_A, WEB_TO_X]);
    });

    it("WHEN web → a is asked again THEN it joins: one scan and one read of web's package.json", async () => {
      const second = scans.ask('web', 'a');

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(ports.scanImports).toHaveBeenCalledTimes(1);
      expect(ports.readText).toHaveBeenCalledTimes(1);
    });

    it('WHEN 20 more asks for web → a arrive THEN each is true and one reply for web → a is posted', async () => {
      const asks = Array.from({ length: 20 }, async () => scans.ask('web', 'a'));

      pending.resolve(IMPORTS_A);
      await first;

      const answers = await Promise.all(asks);

      expect(answers).toStrictEqual(Array.from({ length: 20 }, () => true));
      expect(postedOf(ports)).toStrictEqual([WEB_TO_A]);
    });

    it("WHEN a → @org/x is asked, then web → a again before web's aborted scan settles THEN web → a is answered", async () => {
      const scanOfA = pendingScanOf(ports);
      const second = scans.ask('a', '@org/x');

      vi.mocked(ports.scanImports).mockResolvedValue(IMPORTS_A);

      const third = scans.ask('web', 'a');
      const [webInput, aInput] = scanInputsOf(ports);

      pending.reject(webInput?.signal.reason);
      scanOfA.reject(aInput?.signal.reason);
      await Promise.all([first, second, third]);

      expect(postedOf(ports)).toStrictEqual([WEB_TO_A]);
    });

    it("WHEN a → @org/x is asked THEN web's signal is aborted, no reply for web → a is posted, and a → @org/x is answered", async () => {
      const second = scans.ask('a', '@org/x');
      const [webInput] = scanInputsOf(ports);

      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(webInput?.signal.aborted).toBe(true);
      expect(postedOf(ports)).toStrictEqual([A_TO_X]);
    });

    it("WHEN a → @org/x is asked and web's scan then settles THEN a → @org/x asked again joins a's scan: two scans, not three", async () => {
      const scanOfA = pendingScanOf(ports);
      const second = scans.ask('a', '@org/x');

      pending.resolve(IMPORTS_A);
      await first;

      const third = scans.ask('a', '@org/x');

      scanOfA.resolve(IMPORTS_A);
      await Promise.all([second, third]);

      expect(ports.scanImports).toHaveBeenCalledTimes(2);
    });

    it('WHEN the panel cannot post when the scan resolves THEN nothing is posted', async () => {
      canPost.mockReturnValue(false);
      pending.resolve(IMPORTS_A);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN web → a stops being listed before the scan resolves THEN only web → @org/x is answered', async () => {
      const second = scans.ask('web', '@org/x');

      const edges = GRAPH_STATE_STUB.edges.filter((edge) => edge.target !== 'a');

      state = { ...GRAPH_STATE_STUB, edges };
      pending.resolve(IMPORTS_A);
      await Promise.all([first, second]);

      expect(postedOf(ports)).toStrictEqual([WEB_TO_X]);
    });

    it('WHEN disposed THEN the signal is aborted and nothing is posted after the scan resolves anyway', async () => {
      const [input] = scanInputsOf(ports);

      scans.dispose();
      pending.resolve(IMPORTS_A);
      await first;

      expect(input?.signal.aborted).toBe(true);
      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN disposed and the scan rejects with the abort reason THEN nothing is posted or logged', async () => {
      const [input] = scanInputsOf(ports);

      scans.dispose();
      pending.reject(input?.signal.reason);
      await first;

      expect(ports.post).not.toHaveBeenCalled();
      expect(ports.log).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN web's package.json", () => {
    it("WHEN it aliases a as ui-alias and src/x.ts imports 'ui-alias/y' THEN that site is listed via name", async () => {
      const manifest = '{"dependencies":{"ui-alias":"npm:a@^1"}}';
      const aliased = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('ui-alias/y', 3)])]);

      vi.mocked(ports.readText).mockResolvedValue(manifest);
      vi.mocked(ports.scanImports).mockResolvedValue(aliased);
      await scans.ask('web', 'a');

      const [reply] = postedOf(ports);
      const aliasSite = { line: 3, specifier: 'ui-alias/y', via: 'name' };
      const aliasResult = { kind: 'found', sites: [aliasSite] };

      expect(reply).toMatchObject({ result: aliasResult });
    });

    it.each([
      ['the read gives null', null],
      ['the read holds no JSON object', '[]']
    ])(
      "WHEN %s THEN the scan runs with names [a] and only src/x.ts's import of 'a' is listed, not 'ui-alias/y'",
      async (_title, text) => {
        const unaliased = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('a', 0), sourceImportOf('ui-alias/y', 1)])]);

        vi.mocked(ports.readText).mockResolvedValue(text);
        vi.mocked(ports.scanImports).mockResolvedValue(unaliased);
        await scans.ask('web', 'a');

        expect(postedOf(ports)).toStrictEqual([WEB_TO_A]);
      }
    );

    it('WHEN the read rejects THEN the failure is logged and the scan still runs', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));
      vi.mocked(ports.scanImports).mockResolvedValue(IMPORTS_A);
      await scans.ask('web', 'a');

      expect(ports.log).toHaveBeenCalledWith(expect.stringContaining('EACCES'));
      expect(postedOf(ports)).toStrictEqual([WEB_TO_A]);
    });

    it("WHEN web → a's read is still pending and a → @org/x is asked THEN web's scan is aborted, a's scan is not, and only a → @org/x is answered", async () => {
      const read = Promise.withResolvers<string | null>();
      const scanOfWeb = pendingScanOf(ports);
      const scanOfA = pendingScanOf(ports);

      vi.mocked(ports.readText).mockReturnValueOnce(read.promise);

      const first = scans.ask('web', 'a');
      const second = scans.ask('a', '@org/x');
      const [webInput, aInput] = scanInputsOf(ports);

      expect(scanInputsOf(ports)).toHaveLength(2);

      read.resolve(null);
      scanOfWeb.resolve(IMPORTS_A);
      await first;

      expect(webInput?.signal.aborted).toBe(true);
      expect(aInput?.signal.aborted).toBe(false);

      scanOfA.resolve(importScanOf([]));
      await second;

      expect(postedOf(ports)).toStrictEqual([A_TO_X]);
    });
  });

  describe('GIVEN two packages in one dir whose edges collide under a plain join', () => {
    it('WHEN a|b → c and a → b|c are asked at once THEN each edge gets its reply', async () => {
      state = COLLIDING_STATE;

      await Promise.all([scans.ask('a|b', 'c'), scans.ask('a', 'b|c')]);

      const replies = [importsReplyOf('a|b', 'c', NONE_OF_ZERO), importsReplyOf('a', 'b|c', NONE_OF_ZERO)];

      expect(postedOf(ports)).toStrictEqual(replies);
    });
  });

  describe('GIVEN the root package', () => {
    it("WHEN web → r is asked and src/x.ts imports '../../y' THEN the reply is none: the root gets name rules only", async () => {
      const outside = importScanOf([scannedFileOf('src/x.ts', [sourceImportOf('../../y', 0)])]);

      state = ROOT_STATE;
      vi.mocked(ports.scanImports).mockResolvedValue(outside);
      await scans.ask('web', 'r');

      expect(postedOf(ports)).toStrictEqual([importsReplyOf('web', 'r', NONE_OF_ONE)]);
    });
  });
});
