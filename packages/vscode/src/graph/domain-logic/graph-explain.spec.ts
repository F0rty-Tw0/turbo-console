import { join } from 'node:path';

import { MANIFEST_FILE_MAX, MANIFEST_LINE_MAX } from '@turbo-console/webview-ui';
import type { GraphReady, GraphState } from '@turbo-console/webview-ui';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { answerRequest } from './graph-explain.ts';
import type { ExplainContext, GraphPorts } from '../common/graph.type.ts';
import { graphPortsMock } from '../test/mocks/graph-ports.mock.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

const PACKAGES = [
  graphPackageOf('web', 'apps/web'),
  graphPackageOf('core', 'packages/core'),
  graphPackageOf('//', ''),
  graphPackageOf('__proto__', 'packages/proto'),
  graphPackageOf('constructor', 'packages/ctor')
];

const EDGES = [
  { source: 'web', target: 'core' },
  { source: '//', target: 'core' },
  { source: '__proto__', target: 'constructor' }
];

const READY: GraphReady = { kind: 'graph', hash: 'h', packages: PACKAGES, edges: EDGES, positions: null };

const LOADING: GraphState = { kind: 'loading' };

const MANIFEST = '{\n  "dependencies": {\n    "core": "^1"\n  }\n}';

describe('FEATURE: graph explain', () => {
  let ports: GraphPorts;
  let canPost: Mock<() => boolean>;
  let context: ExplainContext;

  const contextOver = (state: GraphState): ExplainContext => {
    const over: ExplainContext = { state, root: '/ws', ports, canPost };

    return over;
  };

  beforeEach(() => {
    ports = graphPortsMock();
    canPost = vi.fn<() => boolean>(() => true);
    context = contextOver(READY);
  });

  describe('GIVEN an explainEdge for a listed edge', () => {
    it('WHEN the file has the entry THEN readText gets <root>/apps/web/package.json and a found reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue(MANIFEST);

      const handled = await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const entries = [{ field: 'dependencies', key: 'core', spec: '^1', line: 2 }];
      const result = { kind: 'found', file: 'apps/web/package.json', entries };

      expect(handled).toBe(true);
      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(join('/ws', 'apps/web', 'package.json'));
      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN the source is the root package (path "") THEN <root>/package.json is read and named package.json', async () => {
      vi.mocked(ports.readText).mockResolvedValue(MANIFEST);

      await answerRequest({ type: 'explainEdge', source: '//', target: 'core' }, context);

      const entries = [{ field: 'dependencies', key: 'core', spec: '^1', line: 2 }];
      const result = { kind: 'found', file: 'package.json', entries };

      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(join('/ws', 'package.json'));
      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: '//', target: 'core', result });
    });

    it('WHEN the file has no entry THEN a missing reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const result = { kind: 'missing', file: 'apps/web/package.json' };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN the text has no object root THEN an unreadable reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue('[]');

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const result = { kind: 'unreadable', file: 'apps/web/package.json' };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN the file is over the cap (readText gives null) THEN an unreadable reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue(null);

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const result = { kind: 'unreadable', file: 'apps/web/package.json' };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN readText rejects THEN an unreadable reply is posted, the failure is logged and its text is not in the reply', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES: secret/path'));

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const result = { kind: 'unreadable', file: 'apps/web/package.json' };

      expect(ports.log).toHaveBeenCalledOnce();
      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN the names are like Object members THEN __proto__ → constructor is answered from /ws/packages/proto/package.json', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      const handled = await answerRequest({ type: 'explainEdge', source: '__proto__', target: 'constructor' }, context);

      expect(handled).toBe(true);
      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(join('/ws', 'packages/proto', 'package.json'));
    });

    it('WHEN canPost is false after the read THEN nothing is posted and the result is still true', async () => {
      vi.mocked(ports.readText).mockResolvedValue(MANIFEST);
      canPost.mockReturnValue(false);

      const handled = await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      expect(handled).toBe(true);
      expect(ports.post).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an explainEdge whose answer the page would reject', () => {
    it('WHEN the package path makes the shown file longer than the page accepts THEN an unreadable reply names package.json', async () => {
      const packages = [graphPackageOf('deep', 'd'.repeat(MANIFEST_FILE_MAX)), graphPackageOf('core', 'packages/core')];
      const edges = [{ source: 'deep', target: 'core' }];
      const deep: GraphReady = { ...READY, packages, edges };

      vi.mocked(ports.readText).mockResolvedValue(MANIFEST);

      await answerRequest({ type: 'explainEdge', source: 'deep', target: 'core' }, contextOver(deep));

      const result = { kind: 'unreadable', file: 'package.json' };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'deep', target: 'core', result });
    });

    it('WHEN an entry sits on a line past the page limit THEN an unreadable reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue(`${'\n'.repeat(MANIFEST_LINE_MAX + 1)}{"dependencies":{"core":"1"}}`);

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const result = { kind: 'unreadable', file: 'apps/web/package.json' };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });

    it('WHEN an entry sits on the last line the page accepts THEN a found reply is posted', async () => {
      vi.mocked(ports.readText).mockResolvedValue(`${'\n'.repeat(MANIFEST_LINE_MAX)}{"dependencies":{"core":"1"}}`);

      await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, context);

      const entries = [{ field: 'dependencies', key: 'core', spec: '1', line: MANIFEST_LINE_MAX }];
      const result = { kind: 'found', file: 'apps/web/package.json', entries };

      expect(ports.post).toHaveBeenCalledExactlyOnceWith({ type: 'edgeExplained', source: 'web', target: 'core', result });
    });
  });

  describe('GIVEN an explainEdge that is not for this graph', () => {
    it.each([
      ['an unlisted source', 'ghost', 'core'],
      ['an unlisted target', 'web', 'ghost'],
      ['the reversed edge', 'core', 'web'],
      ['two listed packages with no edge', 'web', '__proto__']
    ])('WHEN it names %s THEN false, no read, no post', async (_label, source, target) => {
      const handled = await answerRequest({ type: 'explainEdge', source, target }, context);

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
      expect(ports.post).not.toHaveBeenCalled();
    });

    it('WHEN the state is not a graph THEN false', async () => {
      const handled = await answerRequest({ type: 'explainEdge', source: 'web', target: 'core' }, contextOver(LOADING));

      expect(handled).toBe(false);
      expect(ports.readText).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an openManifest', () => {
    it('WHEN the package is listed THEN its package.json opens at the line', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      const handled = await answerRequest({ type: 'openManifest', packageName: 'web', line: 7 }, context);

      expect(handled).toBe(true);
      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(join('/ws', 'apps/web', 'package.json'), 7);
    });

    it('WHEN the package is the root package THEN <root>/package.json opens', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');

      await answerRequest({ type: 'openManifest', packageName: '//', line: 0 }, context);

      expect(ports.openAt).toHaveBeenCalledExactlyOnceWith(join('/ws', 'package.json'), 0);
    });

    it('WHEN the package is not listed THEN false and nothing opens', async () => {
      const handled = await answerRequest({ type: 'openManifest', packageName: 'ghost', line: 1 }, context);

      expect(handled).toBe(false);
      expect(ports.openAt).not.toHaveBeenCalled();
    });

    it('WHEN the state is not a graph THEN false and nothing opens', async () => {
      const handled = await answerRequest({ type: 'openManifest', packageName: 'web', line: 1 }, contextOver(LOADING));

      expect(handled).toBe(false);
      expect(ports.openAt).not.toHaveBeenCalled();
    });

    it('WHEN the file is not a readable regular file (readText gives null) THEN nothing opens and the path is logged', async () => {
      const handled = await answerRequest({ type: 'openManifest', packageName: 'web', line: 1 }, context);

      const absolute = join('/ws', 'apps/web', 'package.json');

      expect(handled).toBe(true);
      expect(ports.readText).toHaveBeenCalledExactlyOnceWith(absolute);
      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledExactlyOnceWith(`Not a readable package.json: ${absolute}`);
    });

    it('WHEN readText rejects THEN nothing opens and the failure is logged', async () => {
      vi.mocked(ports.readText).mockRejectedValue(new Error('EACCES'));

      const handled = await answerRequest({ type: 'openManifest', packageName: 'web', line: 1 }, context);

      expect(handled).toBe(true);
      expect(ports.openAt).not.toHaveBeenCalled();
      expect(ports.log).toHaveBeenCalledWith('EACCES');
    });

    it('WHEN openAt rejects THEN the failure is logged and the result is true', async () => {
      vi.mocked(ports.readText).mockResolvedValue('{}');
      vi.mocked(ports.openAt).mockRejectedValue(new Error('no editor'));

      const handled = await answerRequest({ type: 'openManifest', packageName: 'web', line: 1 }, context);

      expect(handled).toBe(true);
      expect(ports.log).toHaveBeenCalledExactlyOnceWith('no editor');
    });
  });
});
