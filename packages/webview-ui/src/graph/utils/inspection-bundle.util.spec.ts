import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { nextInspection } from './inspection.util.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection, InspectionInput } from '../common/inspection.type.ts';
import {
  BACKGROUND,
  CANCEL,
  CLEAR,
  CLEAR_TRACE,
  START_TRACE,
  SWAP_ENDS,
  escape,
  explain,
  pickInput,
  select,
  selectFolder,
  tapLink
} from '../test/utils/inspection-inputs.spec.util.ts';
import { bundle, folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

const NONE: Inspection = NO_INSPECTION;

const B: Inspection = bundle('docs', collapsedIdOf('packages'));

const tapBundle = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'tapBundle', source, target };

  return built;
};

const TAP_B: InspectionInput = tapBundle('docs', collapsedIdOf('packages'));

describe('FEATURE: nextInspection of a bundle', () => {
  describe('GIVEN a folder link is tapped', () => {
    it.each([
      { title: 'none', from: NONE },
      { title: 'a package', from: pkg('web') },
      { title: 'a link', from: link('web', 'ui') },
      { title: 'a folder', from: folderInspection('apps') },
      { title: 'a trace', from: trace('web', 'core') },
      { title: 'another bundle', from: bundle('web', collapsedIdOf('packages')) }
    ])('WHEN from $title THEN it becomes the bundle', ({ from }) => {
      const next = nextInspection(from, TAP_B);

      expect(next).toStrictEqual(B);
    });

    it('WHEN picking and not nudged THEN the picking is nudged once', () => {
      const next = nextInspection(pick('web', false), TAP_B);

      expect(next).toStrictEqual(pick('web', true));
    });

    it('WHEN picking and already nudged THEN nothing changes', () => {
      const from = pick('web', true);

      const next = nextInspection(from, TAP_B);

      expect(next).toBe(from);
    });
  });

  describe('GIVEN a bundle is inspected', () => {
    it.each([
      { title: 'background', input: BACKGROUND, to: NONE },
      { title: 'clear', input: CLEAR, to: NONE },
      { title: 'Escape on the canvas', input: escape('canvas'), to: NONE },
      { title: 'a package via canvas', input: select('web', 'canvas'), to: pkg('web') },
      { title: 'a link tap', input: tapLink('web', 'ui'), to: link('web', 'ui') },
      { title: 'explain', input: explain('web', 'ui'), to: link('web', 'ui') },
      { title: 'a folder selection', input: selectFolder('apps'), to: folderInspection('apps') }
    ])('WHEN $title THEN it is replaced', ({ input, to }) => {
      const next = nextInspection(B, input);

      expect(next).toStrictEqual(to);
    });

    it.each([
      { title: 'Escape in the panel', input: escape('panel') },
      { title: 'start trace', input: START_TRACE },
      { title: 'clear trace', input: CLEAR_TRACE },
      { title: 'swap ends', input: SWAP_ENDS },
      { title: 'cancel', input: CANCEL },
      { title: 'a pick', input: pickInput('web') }
    ])('WHEN $title THEN nothing changes', ({ input }) => {
      const next = nextInspection(B, input);

      expect(next).toBe(B);
    });
  });
});
