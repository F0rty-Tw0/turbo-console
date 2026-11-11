import { describe, expect, it } from 'vitest';

import { rootAffectedLineOf } from './root-affected.util.ts';
import type { AffectedStatus, AffectedView } from '../common/affected.type.ts';
import { AFFECTED_VIEW_STUB } from '../test/stubs/affected-view.stub.ts';
import { readsOf } from '../test/utils/affected-reads.spec.util.ts';

const PACKAGE_VIEW: AffectedView = { ...AFFECTED_VIEW_STUB, mode: 'package' };

const WITHOUT_VIEW: AffectedStatus[] = ['loading', 'absent', 'loaded'];

describe('FEATURE: root affected line', () => {
  describe('GIVEN a root with a view', () => {
    it('WHEN the view is task level THEN the line says task level', () => {
      expect(rootAffectedLineOf(readsOf(AFFECTED_VIEW_STUB), '/ws')).toBe('Affected: task level');
    });

    it('WHEN the view is package level THEN the line says package level', () => {
      expect(rootAffectedLineOf(readsOf(PACKAGE_VIEW), '/ws')).toBe('Affected: package level');
    });

    it('WHEN a new query is loading over the earlier result THEN the line stays', () => {
      expect(rootAffectedLineOf(readsOf(AFFECTED_VIEW_STUB, 'loading'), '/ws')).toBe('Affected: task level');
    });
  });

  describe('GIVEN a root without a view', () => {
    it('WHEN the query failed THEN the line says unavailable', () => {
      expect(rootAffectedLineOf(readsOf(null, 'failed'), '/ws')).toBe('Affected: unavailable');
    });

    it.each(WITHOUT_VIEW)('WHEN the status is %s THEN there is no line', (status) => {
      expect(rootAffectedLineOf(readsOf(null, status), '/ws')).toBeNull();
    });
  });
});
