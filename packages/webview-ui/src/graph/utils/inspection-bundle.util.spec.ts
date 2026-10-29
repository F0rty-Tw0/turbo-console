import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { nextInspection } from './inspection.util.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { EscapeWhere, Inspection, InspectionInput, SelectVia } from '../common/inspection.type.ts';
import { bundle, folderInspection, link, pick, pkg, trace } from '../test/utils/inspections.spec.util.ts';

const NONE: Inspection = NO_INSPECTION;

const B: Inspection = bundle('docs', collapsedIdOf('packages'));

const select = (name: string, via: SelectVia): InspectionInput => {
  const built: InspectionInput = { kind: 'select', name, via };

  return built;
};

const pickInput = (name: string): InspectionInput => {
  const built: InspectionInput = { kind: 'pick', name };

  return built;
};

const tapLink = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'tapLink', source, target };

  return built;
};

const explain = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'explain', source, target };

  return built;
};

const tapBundle = (source: string, target: string): InspectionInput => {
  const built: InspectionInput = { kind: 'tapBundle', source, target };

  return built;
};

const escape = (where: EscapeWhere): InspectionInput => {
  const built: InspectionInput = { kind: 'escape', where };

  return built;
};

const selectFolder = (folder: string): InspectionInput => {
  const built: InspectionInput = { kind: 'selectFolder', folder };

  return built;
};

const BACKGROUND: InspectionInput = { kind: 'background' };

const CLEAR: InspectionInput = { kind: 'clear' };

const START_TRACE: InspectionInput = { kind: 'startTrace' };

const CANCEL: InspectionInput = { kind: 'cancel' };

const CLEAR_TRACE: InspectionInput = { kind: 'clearTrace' };

const SWAP_ENDS: InspectionInput = { kind: 'swapEnds' };

const TAP_B: InspectionInput = tapBundle('docs', collapsedIdOf('packages'));

describe('FEATURE: nextInspection of a bundle', () => {
  describe('GIVEN a folder link is tapped', () => {
    it.each([
      ['none', NONE],
      ['a package', pkg('web')],
      ['a link', link('web', 'ui')],
      ['a folder', folderInspection('apps')],
      ['a trace', trace('web', 'core')],
      ['another bundle', bundle('web', collapsedIdOf('packages'))]
    ])('WHEN from %s THEN it becomes the bundle', (_title, from) => {
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
      ['background', BACKGROUND, NONE],
      ['clear', CLEAR, NONE],
      ['Escape on the canvas', escape('canvas'), NONE],
      ['a package via canvas', select('web', 'canvas'), pkg('web')],
      ['a link tap', tapLink('web', 'ui'), link('web', 'ui')],
      ['explain', explain('web', 'ui'), link('web', 'ui')],
      ['a folder selection', selectFolder('apps'), folderInspection('apps')]
    ])('WHEN %s THEN it is replaced', (_title, input, to) => {
      const next = nextInspection(B, input);

      expect(next).toStrictEqual(to);
    });

    it.each([
      ['Escape in the panel', escape('panel')],
      ['start trace', START_TRACE],
      ['clear trace', CLEAR_TRACE],
      ['swap ends', SWAP_ENDS],
      ['cancel', CANCEL],
      ['a pick', pickInput('web')]
    ])('WHEN %s THEN nothing changes', (_title, input) => {
      const next = nextInspection(B, input);

      expect(next).toBe(B);
    });
  });
});
