import { describe, expect, it } from 'vitest';

import { linkModelOf, packageModelOf, pickingModelOf, traceModelOf } from './details-model.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type {
  CandidateGroupModel,
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
  trace: null,
  candidates: null,
  showable: SHOWABLE,
  isRebuild: false
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
});
