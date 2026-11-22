import { describe, expect, it } from 'vitest';

import { allDeclarationsOf, css } from './test/utils/graph-css-rules.spec.util.ts';

describe('FEATURE: graph.css modules mode', () => {
  describe.each(['#graph-controls', '#graph-details', '.widget-row', '.widget-toolbar-package'])(
    'GIVEN the modules mode rule for %s',
    (part) => {
      it('WHEN it is read THEN it hides the part', () => {
        expect(allDeclarationsOf(css, `.modules-mode ${part}`)).toContain('display: none');
      });
    }
  );
});
