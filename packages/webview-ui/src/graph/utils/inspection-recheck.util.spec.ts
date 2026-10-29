import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { recheckInspection } from './inspection-recheck.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, BOARDS_NAMES, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { bundle, folderInspection } from '../test/utils/inspections.spec.util.ts';

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

const PROTO_EDGES: GraphEdge[] = [{ source: '__proto__', target: 'constructor' }];

const NONE: Inspection = NO_INSPECTION;

const PKG: Inspection = { kind: 'package', name: 'web' };

const LINK: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const PICKING: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const NUDGED: Inspection = { kind: 'picking', start: 'web', isNudged: true };

const TRACE: Inspection = { kind: 'trace', start: 'web', end: 'core' };

const PROTO_LINK: Inspection = { kind: 'link', source: '__proto__', target: 'constructor' };

const PROTO_TRACE: Inspection = { kind: 'trace', start: '__proto__', end: 'constructor' };

const PROTO_PKG: Inspection = { kind: 'package', name: '__proto__' };

const ALL_THREE = new Set(['web', 'ui', 'core']);

describe('FEATURE: recheckInspection', () => {
  describe('GIVEN a filter change', () => {
    it.each([
      { title: 'none stays', current: NONE, visible: new Set<string>(), edges: E, expected: NONE },
      { title: 'a visible package stays', current: PKG, visible: ALL_THREE, edges: E, expected: PKG },
      { title: 'a hidden package goes', current: PKG, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'a link between visible ends stays', current: LINK, visible: new Set(['web', 'ui']), edges: E, expected: LINK },
      { title: 'a link with a hidden target goes', current: LINK, visible: new Set(['web']), edges: E, expected: NONE },
      { title: 'a link with a hidden source goes', current: LINK, visible: new Set(['ui']), edges: E, expected: NONE },
      {
        title: 'a link that runs the other way goes',
        current: { kind: 'link', source: 'ui', target: 'web' } satisfies Inspection,
        visible: new Set(['web', 'ui']),
        edges: E,
        expected: NONE
      },
      { title: 'a link whose edge is gone goes', current: LINK, visible: new Set(['web', 'ui']), edges: [], expected: NONE },
      { title: 'picking with a visible start stays', current: PICKING, visible: new Set(['web']), edges: E, expected: PICKING },
      { title: 'picking with a hidden start goes', current: PICKING, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'nudged picking keeps its nudge', current: NUDGED, visible: new Set(['web']), edges: E, expected: NUDGED },
      {
        title: 'nudged picking with a hidden start goes',
        current: NUDGED,
        visible: new Set(['ui', 'core']),
        edges: E,
        expected: NONE
      },
      { title: 'a trace with every package visible stays', current: TRACE, visible: ALL_THREE, edges: E, expected: TRACE },
      { title: 'a trace with a hidden middle stays', current: TRACE, visible: new Set(['web', 'core']), edges: E, expected: TRACE },
      {
        title: 'a trace with a hidden end falls to its start',
        current: TRACE,
        visible: new Set(['web', 'ui']),
        edges: E,
        expected: PKG
      },
      { title: 'a trace with a hidden start goes', current: TRACE, visible: new Set(['ui', 'core']), edges: E, expected: NONE },
      { title: 'a trace with nothing visible goes', current: TRACE, visible: new Set<string>(), edges: E, expected: NONE },
      {
        title: 'a __proto__ link stays',
        current: PROTO_LINK,
        visible: new Set(['__proto__', 'constructor']),
        edges: PROTO_EDGES,
        expected: PROTO_LINK
      },
      {
        title: 'a __proto__ trace with a hidden end falls to its start',
        current: PROTO_TRACE,
        visible: new Set(['__proto__']),
        edges: [],
        expected: PROTO_PKG
      },
      { title: 'a trace needs no edges', current: TRACE, visible: ALL_THREE, edges: [], expected: TRACE }
    ])('WHEN $title THEN the result is exact', ({ current, visible, edges, expected }) => {
      const next = recheckInspection(current, visible, edges, null);

      expect(next).toStrictEqual(expected);
    });
  });
});

const withoutDocsAndWeb = BOARDS_NAMES.filter((name) => name !== 'docs' && name !== 'web');

const ALL_BOARDS = new Set(BOARDS_NAMES);

const WITHOUT_APPS = new Set(withoutDocsAndWeb);

const BOARDS_SCENE = sceneOf(BOARDS_INFOS, BOARDS_EDGES, {});

const GHOST_SCENE = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { visible: withoutDocsAndWeb, ghosts: ['web'] });

const ROOT_INFOS = [{ name: 'root-a', path: 'root-a', tags: [], taskCount: 0 }];

const ROOT_SCENE = sceneOf(ROOT_INFOS, [], {});

const FOLDER_APPS = folderInspection('apps');

describe('FEATURE: recheckInspection of a folder', () => {
  describe('GIVEN a filter change', () => {
    it.each([
      { title: 'a folder with visible members stays', current: FOLDER_APPS, visible: ALL_BOARDS, scene: BOARDS_SCENE, isKept: true },
      {
        title: 'a folder with no visible member goes',
        current: FOLDER_APPS,
        visible: WITHOUT_APPS,
        scene: BOARDS_SCENE,
        isKept: false
      },
      { title: 'a ghost member keeps the folder', current: FOLDER_APPS, visible: WITHOUT_APPS, scene: GHOST_SCENE, isKept: true },
      { title: 'an unknown folder goes', current: folderInspection('zzz'), visible: ALL_BOARDS, scene: BOARDS_SCENE, isKept: false },
      { title: 'a null scene ends the folder', current: FOLDER_APPS, visible: ALL_BOARDS, scene: null, isKept: false },
      {
        title: 'the root folder with a visible root package stays',
        current: folderInspection(''),
        visible: new Set(['root-a']),
        scene: ROOT_SCENE,
        isKept: true
      }
    ])('WHEN $title THEN the inspection is kept or none', ({ current, visible, scene, isKept }) => {
      const expected = isKept ? current : NONE;

      const next = recheckInspection(current, visible, BOARDS_EDGES, scene);

      expect(next).toBe(expected);
    });
  });
});

const P = collapsedIdOf('packages');

const BUNDLE_DOCS = bundle('docs', P);

const PACKAGES_SCENE = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['packages'] });

const withoutNames = (hidden: string[]): string[] => BOARDS_NAMES.filter((name: string): boolean => !hidden.includes(name));

const sceneWithout = (hidden: string[]): FolderScene => {
  return sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['packages'], visible: withoutNames(hidden) });
};

describe('FEATURE: recheckInspection of a bundle', () => {
  describe('GIVEN a filter change that leaves a bundled link', () => {
    it.each([
      { title: 'its link is still drawn', scene: PACKAGES_SCENE },
      { title: 'a hidden end of one bundled link leaves the other link', scene: sceneWithout(['@acme/ui']) }
    ])('WHEN $title THEN the bundle is kept', ({ scene }) => {
      const next = recheckInspection(BUNDLE_DOCS, ALL_BOARDS, BOARDS_EDGES, scene);

      expect(next).toBe(BUNDLE_DOCS);
    });
  });

  describe('GIVEN a filter change that takes the bundled link away', () => {
    it.each([
      { title: 'the folder was expanded', current: BUNDLE_DOCS, scene: sceneOf(BOARDS_INFOS, BOARDS_EDGES, {}) },
      { title: 'the scene is null', current: BUNDLE_DOCS, scene: null },
      { title: 'its source is hidden', current: BUNDLE_DOCS, scene: sceneWithout(['docs']) },
      { title: 'its ends are reversed', current: bundle(P, 'docs'), scene: PACKAGES_SCENE }
    ])('WHEN $title THEN the bundle is none', ({ current, scene }) => {
      const next = recheckInspection(current, ALL_BOARDS, BOARDS_EDGES, scene);

      expect(next).toBe(NONE);
    });
  });
});
