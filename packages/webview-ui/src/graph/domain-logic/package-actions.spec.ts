import { describe, expect, it } from 'vitest';

import { packageActionsOf } from './package-actions.ts';
import { packageActionsDepsMock, packageInspectionActionsMock } from '../test/mocks/widget-menu.mock.ts';
import { callCountOf } from '../test/utils/widget-menu.spec.util.ts';

describe('FEATURE: packageActionsOf', () => {
  describe('GIVEN web is the focused package', () => {
    it('WHEN openDetails runs for web THEN only openDetailsOf is called with web', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).openDetails('web');

      expect(inspection.openDetailsOf).toHaveBeenCalledWith('web');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN focus runs for docs THEN only onFocusOn is called with docs', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).focus('docs');

      expect(deps.onFocusOn).toHaveBeenCalledWith('docs');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN clearFocus runs THEN only onFocusOn is called with the focused web', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).clearFocus();

      expect(deps.onFocusOn).toHaveBeenCalledWith('web');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN startTrace runs THEN only input is called with startTrace', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).startTrace();

      expect(inspection.input).toHaveBeenCalledWith({ kind: 'startTrace' });
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN setShown runs for docs with true THEN only onShow is called with docs', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).setShown('docs', true);

      expect(deps.onShow).toHaveBeenCalledWith('docs');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN setShown runs for docs with false THEN only onExclude is called with docs', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).setShown('docs', false);

      expect(deps.onExclude).toHaveBeenCalledWith('docs');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });

    it('WHEN showTasks runs for docs THEN only onShowTasks is called with docs', () => {
      const deps = packageActionsDepsMock('web');
      const inspection = packageInspectionActionsMock();

      packageActionsOf(deps, inspection).showTasks('docs');

      expect(deps.onShowTasks).toHaveBeenCalledWith('docs');
      expect(callCountOf(deps) + callCountOf(inspection)).toBe(1);
    });
  });

  it('GIVEN no focused package WHEN clearFocus runs THEN nothing is called', () => {
    const deps = packageActionsDepsMock(null);
    const inspection = packageInspectionActionsMock();

    packageActionsOf(deps, inspection).clearFocus();

    expect(callCountOf(deps) + callCountOf(inspection)).toBe(0);
  });
});
