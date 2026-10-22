import { describe, expect, it } from 'vitest';

import { viewStateOf } from './inspection-view-state.util.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphLinkRef, GraphTraceRef, GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { InspectionSave } from '../common/graph-inspection.type.ts';
import type { ControlsViewFields, Viewport } from '../common/graph-page.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionFields } from '../common/inspection.type.ts';
import { link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

type ViewStateRow = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly detailsOpen: boolean;
  readonly fields: InspectionFields;
};

const C: ControlsViewFields = {
  controlsOpen: false,
  search: 'we',
  depth: 2,
  hidden: ['docs'],
  focus: 'web',
  tags: ['app'],
  grouped: false
};

const PAN: Position = { x: 1, y: 2 };

const CAMERA: Viewport = { zoom: 2, pan: PAN };

const stateOf = (fields: InspectionFields, detailsOpen: boolean): GraphViewState => {
  const state: GraphViewState = { hash: 'h1', zoom: 2, pan: PAN, ...C, ...fields, detailsOpen };

  return state;
};

const NONE_FIELDS: InspectionFields = { selected: null, link: null, trace: null };

const WEB_FIELDS: InspectionFields = { selected: 'web', link: null, trace: null };

const WEB_UI_LINK: GraphLinkRef = { source: 'web', target: 'ui' };

const PROTO_LINK: GraphLinkRef = { source: '__proto__', target: 'constructor' };

const WEB_UI_TRACE: GraphTraceRef = { start: 'web', end: 'ui' };

const UI_WEB_TRACE: GraphTraceRef = { start: 'ui', end: 'web' };

const LINK_FIELDS: InspectionFields = { selected: null, link: WEB_UI_LINK, trace: null };

const TRACE_FIELDS: InspectionFields = { selected: 'web', link: null, trace: WEB_UI_TRACE };

const SWAPPED_FIELDS: InspectionFields = { selected: 'ui', link: null, trace: UI_WEB_TRACE };

const PROTO_FIELDS: InspectionFields = { selected: null, link: PROTO_LINK, trace: null };

describe('FEATURE: viewStateOf', () => {
  describe('GIVEN the camera and the controls fields', () => {
    it.each([
      { title: 'nothing is inspected', inspection: NO_INSPECTION, detailsOpen: true, fields: NONE_FIELDS },
      { title: 'a package is inspected with the panel closed', inspection: pkg('web'), detailsOpen: false, fields: WEB_FIELDS },
      { title: 'a link is inspected', inspection: link('web', 'ui'), detailsOpen: true, fields: LINK_FIELDS },
      { title: 'an end is being picked', inspection: pick('web', false), detailsOpen: true, fields: WEB_FIELDS },
      { title: 'a trace shows', inspection: trace('web', 'ui'), detailsOpen: true, fields: TRACE_FIELDS },
      { title: 'a trace shows after Swap ends', inspection: trace('ui', 'web'), detailsOpen: true, fields: SWAPPED_FIELDS },
      {
        title: 'a __proto__ link is inspected',
        inspection: link('__proto__', 'constructor'),
        detailsOpen: true,
        fields: PROTO_FIELDS
      }
    ] satisfies ViewStateRow[])('WHEN $title THEN the saved state is exact', ({ inspection, detailsOpen, fields }) => {
      const shown: InspectionSave = { inspection, detailsOpen };
      const expected = stateOf(fields, detailsOpen);

      const state = viewStateOf('h1', CAMERA, C, shown);

      expect(state).toStrictEqual(expected);
    });
  });
});
