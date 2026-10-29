import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { inspectionFieldsOf, restoredInspection } from './inspection-state.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionFields } from '../common/inspection.type.ts';
import { bundle } from '../test/utils/inspections.spec.util.ts';

const fieldsOf = (parts: Partial<InspectionFields>): InspectionFields => {
  const fields: InspectionFields = { selected: null, link: null, trace: null, folder: null, ...parts };

  return fields;
};

const E: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

const NONE: Inspection = NO_INSPECTION;

const PKG: Inspection = { kind: 'package', name: 'web' };

const LINK: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const TRACE: Inspection = { kind: 'trace', start: 'web', end: 'core' };

const FOLDER_APPS: Inspection = { kind: 'folder', folder: 'apps' };

const FOLDER_ROOT: Inspection = { kind: 'folder', folder: '' };

const FOLDER_PACKAGES: Inspection = { kind: 'folder', folder: 'packages' };

const PROTO_FOLDER: Inspection = { kind: 'folder', folder: '__proto__' };

const PROTO_TRACE: Inspection = { kind: 'trace', start: '__proto__', end: 'constructor' };

const ALL = new Set(['web', 'ui', 'core']);

const NO_FOLDERS = new Set<string>();

const FOLDERS = new Set(['apps', 'packages']);

const WEB_CORE = new Set(['web', 'core']);

const WEB_UI = new Set(['web', 'ui']);

const UI_CORE = new Set(['ui', 'core']);

const LINK_REF = { source: 'web', target: 'ui' };

const REVERSED_LINK_REF = { source: 'ui', target: 'web' };

const UI_CORE_LINK_REF = { source: 'ui', target: 'core' };

const PROTO_LINK_REF = { source: '__proto__', target: 'constructor' };

const TRACE_REF = { start: 'web', end: 'core' };

const SWAPPED_TRACE_REF = { start: 'core', end: 'web' };

const SELF_TRACE_REF = { start: 'web', end: 'web' };

const PROTO_TRACE_REF = { start: '__proto__', end: 'constructor' };

describe('FEATURE: inspectionFieldsOf', () => {
  describe('GIVEN an inspection to save', () => {
    it.each([
      { title: 'none saves nothing', inspection: NONE, expected: fieldsOf({}) },
      { title: 'a package saves it as selected', inspection: PKG, expected: fieldsOf({ selected: 'web' }) },
      { title: 'a link saves only the link', inspection: LINK, expected: fieldsOf({ link: LINK_REF }) },
      {
        title: 'picking saves its start as selected',
        inspection: { kind: 'picking', start: 'web', isNudged: false } satisfies Inspection,
        expected: fieldsOf({ selected: 'web' })
      },
      {
        title: 'nudged picking saves its start as selected',
        inspection: { kind: 'picking', start: 'web', isNudged: true } satisfies Inspection,
        expected: fieldsOf({ selected: 'web' })
      },
      {
        title: 'a trace saves the trace and its start as selected',
        inspection: TRACE,
        expected: fieldsOf({ selected: 'web', trace: TRACE_REF })
      },
      {
        title: 'a swapped trace saves its new start as selected',
        inspection: { kind: 'trace', start: 'core', end: 'web' } satisfies Inspection,
        expected: fieldsOf({ selected: 'core', trace: SWAPPED_TRACE_REF })
      },
      { title: 'a folder saves only the folder', inspection: FOLDER_APPS, expected: fieldsOf({ folder: 'apps' }) },
      {
        title: 'a bundle saves as none',
        inspection: bundle('docs', collapsedIdOf('packages')),
        expected: fieldsOf({})
      },
      { title: 'the root folder saves its empty key', inspection: FOLDER_ROOT, expected: fieldsOf({ folder: '' }) },
      {
        title: 'a __proto__ link saves only the link',
        inspection: { kind: 'link', source: '__proto__', target: 'constructor' } satisfies Inspection,
        expected: fieldsOf({ link: PROTO_LINK_REF })
      }
    ])('WHEN $title THEN the fields are exact', ({ inspection, expected }) => {
      const fields = inspectionFieldsOf(inspection);

      expect(fields).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: restoredInspection', () => {
  describe('GIVEN a saved state and the rebuilt graph', () => {
    it.each([
      { title: 'nothing saved gives none', saved: fieldsOf({}), edges: E, visible: ALL, expected: NONE },
      { title: 'a saved package comes back', saved: fieldsOf({ selected: 'web' }), edges: E, visible: ALL, expected: PKG },
      { title: 'a hidden package goes', saved: fieldsOf({ selected: 'web' }), edges: E, visible: UI_CORE, expected: NONE },
      { title: 'an unknown package goes', saved: fieldsOf({ selected: 'ghost' }), edges: E, visible: ALL, expected: NONE },
      { title: 'a saved link comes back', saved: fieldsOf({ link: LINK_REF }), edges: E, visible: ALL, expected: LINK },
      { title: 'a link with a hidden end goes', saved: fieldsOf({ link: LINK_REF }), edges: E, visible: WEB_CORE, expected: NONE },
      {
        title: 'a link with a hidden end falls to selected',
        saved: fieldsOf({ link: LINK_REF, selected: 'web' }),
        edges: E,
        visible: WEB_CORE,
        expected: PKG
      },
      {
        title: 'a link with no such edge goes',
        saved: fieldsOf({ link: REVERSED_LINK_REF }),
        edges: E,
        visible: ALL,
        expected: NONE
      },
      {
        title: 'a link with no such edge falls to selected',
        saved: fieldsOf({ link: REVERSED_LINK_REF, selected: 'web' }),
        edges: E,
        visible: ALL,
        expected: PKG
      },
      {
        title: 'a saved trace comes back',
        saved: fieldsOf({ trace: TRACE_REF, selected: 'web' }),
        edges: E,
        visible: ALL,
        expected: TRACE
      },
      {
        title: 'a trace with a hidden middle comes back',
        saved: fieldsOf({ trace: TRACE_REF, selected: 'web' }),
        edges: E,
        visible: WEB_CORE,
        expected: TRACE
      },
      {
        title: 'a trace with a hidden end falls to selected',
        saved: fieldsOf({ trace: TRACE_REF, selected: 'web' }),
        edges: E,
        visible: WEB_UI,
        expected: PKG
      },
      {
        title: 'a dropped trace falls to the link before selected',
        saved: fieldsOf({ trace: TRACE_REF, link: LINK_REF, selected: 'web' }),
        edges: E,
        visible: WEB_UI,
        expected: LINK
      },
      {
        title: 'a dropped trace falls to a link that does not need its start',
        saved: fieldsOf({ trace: TRACE_REF, link: UI_CORE_LINK_REF, selected: 'web' }),
        edges: E,
        visible: UI_CORE,
        expected: { kind: 'link', source: 'ui', target: 'core' } satisfies Inspection
      },
      {
        title: 'a trace from a package to itself falls to selected',
        saved: fieldsOf({ trace: SELF_TRACE_REF, selected: 'web' }),
        edges: E,
        visible: ALL,
        expected: PKG
      },
      {
        title: 'a trace wins over a link and selected',
        saved: fieldsOf({ trace: TRACE_REF, link: LINK_REF, selected: 'web' }),
        edges: E,
        visible: ALL,
        expected: TRACE
      },
      {
        title: 'a link wins over selected',
        saved: fieldsOf({ link: LINK_REF, selected: 'core' }),
        edges: E,
        visible: ALL,
        expected: LINK
      },
      {
        title: 'a __proto__ trace needs no edges',
        saved: fieldsOf({ trace: PROTO_TRACE_REF, selected: '__proto__' }),
        edges: [],
        visible: new Set(['__proto__', 'constructor']),
        expected: PROTO_TRACE
      }
    ])('WHEN $title THEN the inspection is exact', ({ saved, edges, visible, expected }) => {
      const inspection = restoredInspection(saved, edges, visible, NO_FOLDERS);

      expect(inspection).toStrictEqual(expected);
    });
  });
});

describe('FEATURE: restoredInspection with folders', () => {
  describe('GIVEN a saved folder and the folders that still exist', () => {
    it.each([
      {
        title: 'a valid trace wins over link, folder and selected',
        saved: fieldsOf({ trace: TRACE_REF, link: LINK_REF, folder: 'apps', selected: 'web' }),
        visible: ALL,
        folders: FOLDERS,
        expected: TRACE
      },
      {
        title: 'a trace with a hidden end falls to the link',
        saved: fieldsOf({ trace: TRACE_REF, link: LINK_REF, folder: 'apps', selected: 'web' }),
        visible: WEB_UI,
        folders: FOLDERS,
        expected: LINK
      },
      {
        title: 'a folder wins over selected',
        saved: fieldsOf({ folder: 'packages', selected: 'web' }),
        visible: ALL,
        folders: FOLDERS,
        expected: FOLDER_PACKAGES
      },
      {
        title: 'a folder that is gone falls to selected',
        saved: fieldsOf({ folder: 'gone', selected: 'web' }),
        visible: ALL,
        folders: FOLDERS,
        expected: PKG
      },
      {
        title: 'a hidden folder falls to selected',
        saved: fieldsOf({ folder: 'apps', selected: 'web' }),
        visible: ALL,
        folders: new Set(['packages']),
        expected: PKG
      },
      {
        title: 'the root folder comes back',
        saved: fieldsOf({ folder: '' }),
        visible: ALL,
        folders: new Set(['']),
        expected: FOLDER_ROOT
      },
      {
        title: 'a __proto__ folder comes back',
        saved: fieldsOf({ folder: '__proto__' }),
        visible: ALL,
        folders: new Set(['__proto__']),
        expected: PROTO_FOLDER
      },
      {
        title: 'a __proto__ folder that is gone goes',
        saved: fieldsOf({ folder: '__proto__' }),
        visible: ALL,
        folders: new Set(['x']),
        expected: NONE
      },
      { title: 'no folder saved gives none', saved: fieldsOf({}), visible: ALL, folders: FOLDERS, expected: NONE }
    ])('WHEN $title THEN the inspection is exact', ({ saved, visible, folders, expected }) => {
      const inspection = restoredInspection(saved, E, visible, folders);

      expect(inspection).toStrictEqual(expected);
    });
  });
});
