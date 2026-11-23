import { describe, expect, it } from 'vitest';

import { allDeclarationsOf, css } from './test/utils/graph-css-rules.spec.util.ts';

describe('FEATURE: graph.css modules mode', () => {
  describe.each([
    '#graph-controls',
    '#graph-details',
    '.widget-row',
    '.widget-toolbar-package',
    '.legend-button',
    '.graph-legend',
    '.graph-location'
  ])('GIVEN the modules mode rule for %s', (part) => {
    it('WHEN it is read THEN it hides the part', () => {
      expect(allDeclarationsOf(css, `.modules-mode ${part}`)).toContain('display: none');
    });
  });

  describe('GIVEN the Panels group rule', () => {
    it('WHEN it is read THEN modules mode does not hide it', () => {
      expect(allDeclarationsOf(css, ".modules-mode .toolbar-group[aria-label='Panels']")).not.toContain('display: none');
    });
  });

  describe.each([
    '.graph-page.modules-mode .graph-body:has(> #graph-module-controls:not([hidden])) > .graph-sash-controls',
    '.graph-page.modules-mode .graph-body:has(> #graph-module-details:not([hidden])) > .graph-sash-details'
  ])('GIVEN the sash rule %s', (selector) => {
    it('WHEN it is read THEN it shows the sash', () => {
      expect(allDeclarationsOf(css, selector)).toContain('display: block');
    });
  });
});
