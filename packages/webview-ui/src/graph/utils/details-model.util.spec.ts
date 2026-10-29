import { describe, expect, it } from 'vitest';

import { bundleModelOf, folderModelOf, linkModelOf, packageModelOf, pickingModelOf, traceModelOf } from './details-model.util.ts';
import { collapsedIdOf } from './folder-id.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type {
  BundleEndModel,
  BundleViewModel,
  CandidateGroupModel,
  FolderViewModel,
  NeighbourModel,
  PackageViewModel,
  PickingViewModel,
  TraceStepModel,
  TraceViewModel
} from '../common/details.type.ts';
import type { DetailsContext } from '../common/graph-details.type.ts';
import type { DrawnGraph } from '../common/graph-page.type.ts';
import type { TraceInspection } from '../common/inspection.type.ts';
import type { TraceCandidate, TraceCandidates, TraceResult } from '../common/trace.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, sceneOf } from '../test/utils/folder-boards.spec.util.ts';

const infoOf = (name: string, path: string): GraphPackage => {
  const info: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return info;
};

const WEB: GraphPackage = { name: 'web', path: 'apps/web', tags: [], taskCount: 5 };

const INFOS: GraphPackage[] = [WEB, infoOf('ui', 'packages/ui'), infoOf('core', 'packages/core'), infoOf('docs', 'apps/docs')];

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'web', target: 'core' },
  { source: 'docs', target: 'web' }
];

const DRAWN: DrawnGraph = { hash: 'h', packages: ['web', 'ui', 'core', 'docs'], infos: INFOS, edges: EDGES };

const VISIBLE: ReadonlySet<string> = new Set(['web', 'core', 'docs']);

const SHOWABLE: ReadonlySet<string> = new Set(['ui']);

const CTX: DetailsContext = {
  drawn: DRAWN,
  visible: VISIBLE,
  focus: 'web',
  showable: SHOWABLE,
  isRebuild: false,
  scene: null,
  focusedFolder: null
};

const ctxWith = (info: GraphPackage): DetailsContext => {
  const infos = [...INFOS, info];
  const drawn: DrawnGraph = { ...DRAWN, infos };
  const context: DetailsContext = { ...CTX, drawn };

  return context;
};

const PATH_EDGES: GraphEdge[] = [
  { source: 'web', target: 'core' },
  { source: 'core', target: 'ui' }
];

const FORWARD: TraceResult = { direction: 'forward', path: ['web', 'core', 'ui'], edges: PATH_EDGES };

const BACKWARD: TraceResult = { direction: 'backward', path: ['web', 'core', 'ui'], edges: PATH_EDGES };

const NO_PATH: TraceResult = { direction: 'none', path: [], edges: [] };

const A: TraceCandidate = { name: 'a', steps: 1 };

const B: TraceCandidate = { name: 'b', steps: 2 };

const ALL: TraceCandidates = { forward: [A, B], backward: [], none: ['c', 'd'] };

const FILTERED: TraceCandidates = { forward: [A], backward: [], none: [] };

const TRACE_WEB_UI: TraceInspection = { kind: 'trace', start: 'web', end: 'ui' };

const TRACE_UI_WEB: TraceInspection = { kind: 'trace', start: 'ui', end: 'web' };

const PROTO_CANDIDATES: TraceCandidates = { forward: [], backward: [], none: ['__proto__'] };

const BOARDS_CTX: DetailsContext = { ...CTX, scene: sceneOf(BOARDS_INFOS, BOARDS_EDGES, {}) };

const PACKAGES_ID = collapsedIdOf('packages');

const APPS_ID = collapsedIdOf('apps');

const BUNDLE_SCENE = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['packages'] });

const BUNDLE_CTX: DetailsContext = { ...CTX, scene: BUNDLE_SCENE };

const DOCS_END: BundleEndModel = { text: 'docs', folder: null };

const APPS_END: BundleEndModel = { text: 'apps', folder: 'apps' };

const PACKAGES_END: BundleEndModel = { text: 'packages', folder: 'packages' };

const memberOf = (name: string, isVisible: boolean): NeighbourModel => {
  const member: NeighbourModel = { name, isVisible };

  return member;
};

const ctxOver = (infos: GraphPackage[]): DetailsContext => {
  const scene = sceneOf(infos, [], {});
  const context: DetailsContext = { ...CTX, scene };

  return context;
};

describe('FEATURE: details models', () => {
  describe('GIVEN web, focused, depending on ui (hidden) and core, with docs depending on it', () => {
    it('WHEN the package model of web is built THEN it is exact, lists sorted by name', () => {
      const core: NeighbourModel = { name: 'core', isVisible: true };
      const ui: NeighbourModel = { name: 'ui', isVisible: false };
      const docs: NeighbourModel = { name: 'docs', isVisible: true };
      const dependencies = [core, ui];
      const dependents = [docs];
      const expected: PackageViewModel = {
        name: 'web',
        path: 'apps/web',
        tags: [],
        taskCount: 5,
        isFocused: true,
        dependencies,
        dependents
      };

      const model = packageModelOf('web', CTX);

      expect(model).toStrictEqual(expected);
    });

    it('WHEN nothing is focused THEN web is not focused', () => {
      const context: DetailsContext = { ...CTX, focus: null };

      const model = packageModelOf('web', context);

      expect(model?.isFocused).toBe(false);
    });

    it('WHEN the package has no record THEN there is no model', () => {
      const model = packageModelOf('ghost', CTX);

      expect(model).toBeNull();
    });

    it('WHEN the package is named __proto__ THEN its model carries the name', () => {
      const context = ctxWith(infoOf('__proto__', 'packages/proto'));

      const model = packageModelOf('__proto__', context);

      expect(model?.name).toBe('__proto__');
    });

    it('WHEN the link web → ui is modelled THEN the file is web’s manifest', () => {
      const model = linkModelOf('web', 'ui', CTX);

      expect(model).toStrictEqual({ source: 'web', target: 'ui', file: 'apps/web/package.json' });
    });

    it('WHEN the link starts at the root package THEN the file is the root manifest', () => {
      const context = ctxWith(infoOf('root', ''));

      const model = linkModelOf('root', 'ui', context);

      expect(model.file).toBe('package.json');
    });

    it('WHEN the link starts at a package with no record THEN the file falls back to the root manifest', () => {
      const model = linkModelOf('ghost', 'ui', CTX);

      expect(model.file).toBe('package.json');
    });
  });

  describe('GIVEN the trace web → core → ui with ui hidden', () => {
    it('WHEN ui can be shown THEN the steps are exact', () => {
      const web: TraceStepModel = { name: 'web', isVisible: true, isShowable: false };
      const core: TraceStepModel = { name: 'core', isVisible: true, isShowable: false };
      const ui: TraceStepModel = { name: 'ui', isVisible: false, isShowable: true };
      const steps = [web, core, ui];
      const expected: TraceViewModel = { start: 'web', end: 'ui', direction: 'forward', steps };

      const model = traceModelOf(TRACE_WEB_UI, FORWARD, VISIBLE, SHOWABLE);

      expect(model).toStrictEqual(expected);
    });

    it('WHEN nothing can be shown THEN the ui step is not showable', () => {
      const model = traceModelOf(TRACE_WEB_UI, FORWARD, VISIBLE, new Set());

      expect(model.steps[2]).toStrictEqual({ name: 'ui', isVisible: false, isShowable: false });
    });

    it('WHEN the trace was found backward from ui THEN the steps keep the dependent first', () => {
      const model = traceModelOf(TRACE_UI_WEB, BACKWARD, VISIBLE, SHOWABLE);
      const names = model.steps.map((step) => step.name);

      expect(names).toStrictEqual(['web', 'core', 'ui']);
    });

    it('WHEN no path was found THEN there are no steps', () => {
      const model = traceModelOf(TRACE_WEB_UI, NO_PATH, VISIBLE, SHOWABLE);

      expect(model.steps).toStrictEqual([]);
    });
  });

  describe('GIVEN candidates from docs: 2 forward, 0 backward, 2 unrelated', () => {
    it('WHEN the filter leaves 1 / 0 / 0 THEN the groups keep their totals', () => {
      const forwardItems = [A];
      const forward: CandidateGroupModel = { key: 'forward', total: 2, items: forwardItems };
      const backward: CandidateGroupModel = { key: 'backward', total: 0, items: [] };
      const none: CandidateGroupModel = { key: 'none', total: 2, items: [] };
      const groups = [forward, backward, none];
      const expected: PickingViewModel = { start: 'docs', groups };

      const model = pickingModelOf('docs', ALL, FILTERED);

      expect(model).toStrictEqual(expected);
    });

    it('WHEN nothing is filtered THEN the unrelated items carry no steps', () => {
      const model = pickingModelOf('docs', ALL, ALL);

      expect(model.groups[2]?.items).toStrictEqual([
        { name: 'c', steps: null },
        { name: 'd', steps: null }
      ]);
    });

    it('WHEN the start and a candidate are __proto__ THEN the item is named __proto__', () => {
      const model = pickingModelOf('__proto__', PROTO_CANDIDATES, PROTO_CANDIDATES);

      expect(model.groups[2]?.items[0]?.name).toBe('__proto__');
    });
  });
  describe('GIVEN the boards scene', () => {
    it('WHEN the model of packages is built THEN it is exact, members sorted and visible', () => {
      const members = [memberOf('@acme/config', true), memberOf('@acme/ui', true), memberOf('@acme/utils', true)];
      const expected: FolderViewModel = {
        folder: 'packages',
        title: 'packages',
        summary: '3 packages · 1 link inside',
        packagesTitle: 'Packages (3)',
        isCollapsed: false,
        isFocused: false,
        isOverlay: false,
        members
      };

      const model = folderModelOf('packages', BOARDS_CTX, false);

      expect(model).toStrictEqual(expected);
    });

    it('WHEN packages is the folder focus THEN it is focused', () => {
      const context: DetailsContext = { ...BOARDS_CTX, focusedFolder: 'packages' };

      const model = folderModelOf('packages', context, false);

      expect(model?.isFocused).toBe(true);
    });

    it('WHEN apps is the folder focus THEN packages is not focused', () => {
      const context: DetailsContext = { ...BOARDS_CTX, focusedFolder: 'apps' };

      const model = folderModelOf('packages', context, false);

      expect(model?.isFocused).toBe(false);
    });

    it('WHEN the panel overlays the canvas THEN the model says so', () => {
      const model = folderModelOf('packages', BOARDS_CTX, true);

      expect(model?.isOverlay).toBe(true);
    });

    it('WHEN @acme/ui is not visible THEN its member is hidden and the count stays 3', () => {
      const scene = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { visible: ['docs', 'web', '@acme/config', '@acme/utils'] });
      const context: DetailsContext = { ...BOARDS_CTX, scene };
      const members = [memberOf('@acme/config', true), memberOf('@acme/ui', false), memberOf('@acme/utils', true)];

      const model = folderModelOf('packages', context, false);

      expect(model?.members).toStrictEqual(members);
      expect(model?.packagesTitle).toBe('Packages (3)');
    });

    it('WHEN packages is collapsed THEN the model is collapsed', () => {
      const scene = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['packages'] });
      const context: DetailsContext = { ...BOARDS_CTX, scene };

      const model = folderModelOf('packages', context, false);

      expect(model?.isCollapsed).toBe(true);
    });

    it('WHEN the folder is unknown THEN there is no model', () => {
      const model = folderModelOf('zzz', BOARDS_CTX, false);

      expect(model).toBeNull();
    });
  });

  describe('GIVEN no folder scene', () => {
    it('WHEN the model of packages is built THEN there is no model', () => {
      const model = folderModelOf('packages', CTX, false);

      expect(model).toBeNull();
    });
  });

  describe('GIVEN a folder whose packages are not in code unit order', () => {
    it('WHEN the model is built THEN the members run by code unit', () => {
      const context = ctxOver([infoOf('web', 'f/web'), infoOf('Zed', 'f/Zed'), infoOf('@acme/a', 'f/a')]);
      const members = [memberOf('@acme/a', true), memberOf('Zed', true), memberOf('web', true)];

      const model = folderModelOf('f', context, false);

      expect(model?.members).toStrictEqual(members);
    });
  });

  describe('GIVEN root packages beside a real (root) folder', () => {
    it.each([
      { folder: '', expected: '(root)' },
      { folder: '(root)', expected: './(root)' }
    ])('WHEN the model of "$folder" is built THEN its title is $expected', ({ folder, expected }) => {
      const context = ctxOver([infoOf('r', 'r'), infoOf('p', '(root)/p')]);

      const model = folderModelOf(folder, context, false);

      expect(model?.title).toBe(expected);
    });
  });

  describe('GIVEN docs bundled into the collapsed packages', () => {
    it('WHEN the bundle is modelled THEN the ends, the count and the links are exact', () => {
      const expected: BundleViewModel = {
        source: DOCS_END,
        target: PACKAGES_END,
        countText: '2 links',
        links: BOARDS_EDGES.slice(1, 3)
      };

      const model = bundleModelOf('docs', PACKAGES_ID, BUNDLE_CTX);

      expect(model).toStrictEqual(expected);
    });

    it('WHEN the bundle is modelled THEN its links are the scene link’s own array', () => {
      const model = bundleModelOf('docs', PACKAGES_ID, BUNDLE_CTX);

      expect(model?.links).toBe(BUNDLE_SCENE.links[1]?.links);
    });
  });

  describe('GIVEN no such link', () => {
    it('WHEN the ends are swapped THEN the model is null', () => {
      const model = bundleModelOf(PACKAGES_ID, 'docs', BUNDLE_CTX);

      expect(model).toBeNull();
    });

    it('WHEN there is no scene THEN the model is null', () => {
      const model = bundleModelOf('docs', PACKAGES_ID, { ...CTX, scene: null });

      expect(model).toBeNull();
    });
  });

  describe('GIVEN apps and packages both collapsed', () => {
    it('WHEN apps ⇒ packages is modelled THEN it counts 3 links and both ends are folders', () => {
      const both = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['apps', 'packages'] });

      const expected: BundleViewModel = {
        source: APPS_END,
        target: PACKAGES_END,
        countText: '3 links',
        links: BOARDS_EDGES.slice(0, 3)
      };

      const model = bundleModelOf(APPS_ID, PACKAGES_ID, { ...CTX, scene: both });

      expect(model).toStrictEqual(expected);
    });
  });
});
