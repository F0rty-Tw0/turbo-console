import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { inspectionTextOf } from './inspection-text.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { TraceResult } from '../common/trace.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { bundle, folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

type TextRow = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly result: TraceResult | null;
  readonly visible: ReadonlySet<string>;
  readonly scene: FolderScene | null;
  readonly expected: string;
};

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' },
  { source: 'docs', target: 'web' }
];

const ALL: ReadonlySet<string> = new Set(['web', 'ui', 'core', 'docs', '@acme/ui']);

const NO_UI: ReadonlySet<string> = new Set(['web', 'core', 'docs']);

const PATH = ['web', 'ui', 'core'];

const FORWARD: TraceResult = { direction: 'forward', path: PATH, edges: [] };

const BACKWARD: TraceResult = { direction: 'backward', path: PATH, edges: [] };

const NO_PATH: TraceResult = { direction: 'none', path: [], edges: [] };

const BOARDS_SCENE = sceneOf(BOARDS_INFOS, BOARDS_EDGES, {});

const ROOT_INFOS: GraphPackage[] = [
  { name: 'r', path: 'r', tags: [], taskCount: 0 },
  { name: 'p', path: 'x/p', tags: [], taskCount: 0 }
];

const ROOT_SCENE = sceneOf(ROOT_INFOS, [{ source: 'p', target: 'r' }], {});

describe('FEATURE: inspectionTextOf', () => {
  describe('GIVEN the drawn edges', () => {
    it.each([
      { title: 'nothing is inspected', inspection: NO_INSPECTION, result: null, visible: ALL, scene: null, expected: '' },
      {
        title: 'a package is inspected',
        inspection: pkg('web'),
        result: null,
        visible: ALL,
        scene: null,
        expected: 'web · 2 dependencies, 1 direct · 1 dependent, 1 direct'
      },
      {
        title: 'a link is inspected',
        inspection: link('web', '@acme/ui'),
        result: null,
        visible: ALL,
        scene: null,
        expected: 'web depends on @acme/ui'
      },
      {
        title: 'an end is being picked',
        inspection: pick('web', false),
        result: null,
        visible: ALL,
        scene: null,
        expected: 'Trace from web: select the end package'
      },
      {
        title: 'a link tap nudged the picking',
        inspection: pick('web', true),
        result: null,
        visible: ALL,
        scene: null,
        expected: 'Pick a package to end the trace'
      },
      {
        title: 'a forward trace shows',
        inspection: trace('web', 'core'),
        result: FORWARD,
        visible: ALL,
        scene: null,
        expected: 'Trace web → core: 3 packages'
      },
      {
        title: 'a backward trace shows',
        inspection: trace('core', 'web'),
        result: BACKWARD,
        visible: ALL,
        scene: null,
        expected: 'Trace core → web: 3 packages'
      },
      {
        title: 'a forward trace has a hidden middle',
        inspection: trace('web', 'core'),
        result: FORWARD,
        visible: NO_UI,
        scene: null,
        expected: 'Trace web → core: 3 packages, 1 hidden'
      },
      {
        title: 'a trace has no path',
        inspection: trace('web', 'docs'),
        result: NO_PATH,
        visible: ALL,
        scene: null,
        expected: 'No dependency path between web and docs'
      },
      { title: 'a trace has no result yet', inspection: trace('web', 'core'), result: null, visible: ALL, scene: null, expected: '' },
      {
        title: 'a bundle reads nothing until U4g writes its summary',
        inspection: bundle('docs', collapsedIdOf('packages')),
        result: null,
        visible: ALL,
        scene: BOARDS_SCENE,
        expected: ''
      },
      {
        title: 'a folder is inspected',
        inspection: folderInspection('apps'),
        result: null,
        visible: ALL,
        scene: BOARDS_SCENE,
        expected: 'Folder apps: 2 packages, 3 links out'
      },
      {
        title: 'the root folder is inspected',
        inspection: folderInspection(''),
        result: null,
        visible: ALL,
        scene: ROOT_SCENE,
        expected: 'Folder (root): 1 package, 1 link in'
      },
      { title: 'a folder has no scene', inspection: folderInspection('apps'), result: null, visible: ALL, scene: null, expected: '' }
    ] satisfies TextRow[])('WHEN $title THEN the status text is exact', ({ inspection, result, visible, scene, expected }) => {
      const text = inspectionTextOf(inspection, E, result, visible, scene);

      expect(text).toBe(expected);
    });
  });
});
