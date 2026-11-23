import { describe, expect, it } from 'vitest';

import {
  MODULES_DROPPED_WARNING,
  MODULES_MODE_CLASS,
  MODULE_CONTROLS_ID,
  MODULE_DETAILS_EMPTY_TEXT,
  MODULE_DETAILS_ID,
  MODULE_FOCUS_SECTION_TITLE,
  MODULE_IMPORTED_BY_HEADING,
  MODULE_IMPORTS_HEADING,
  MODULE_NO_FOCUS_TEXT,
  MODULE_SHOWN_CAP,
  MODULE_SLOW_TEXT
} from './graph-module.const.ts';

describe('FEATURE: module constants', () => {
  describe('GIVEN the spec values (D10, §7.4)', () => {
    it('WHEN read THEN the cap is 300 and the slow text is verbatim', () => {
      expect(MODULE_SHOWN_CAP).toBe(300);
      expect(MODULE_SLOW_TEXT).toBe('Drawing more than 300 items can be slow.');
    });
  });

  describe('GIVEN the page mode values (§8)', () => {
    it('WHEN read THEN the root class and the dropped warning are verbatim', () => {
      expect(MODULES_MODE_CLASS).toBe('modules-mode');
      expect(MODULES_DROPPED_WARNING).toBe('Dropped an invalid packageModules message from the host.');
    });
  });

  describe('GIVEN the module Controls values (§6.2)', () => {
    it('WHEN read THEN the panel id, the Focus title and the no-focus text are verbatim', () => {
      expect([MODULE_CONTROLS_ID, MODULE_FOCUS_SECTION_TITLE, MODULE_NO_FOCUS_TEXT]).toStrictEqual([
        'graph-module-controls',
        'Focus',
        'None'
      ]);
    });
  });

  describe('GIVEN the module Details values (§6.3)', () => {
    it('WHEN read THEN the panel id, the two list headings and the empty hint are verbatim', () => {
      expect([MODULE_DETAILS_ID, MODULE_IMPORTS_HEADING, MODULE_IMPORTED_BY_HEADING, MODULE_DETAILS_EMPTY_TEXT]).toStrictEqual([
        'graph-module-details',
        'Imports',
        'Imported by',
        'Select a file, package or link to see its imports.'
      ]);
    });
  });
});
