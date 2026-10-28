import { describe, expect, it } from 'vitest';

import { css, declarationsOf, ruleOf } from './test/utils/graph-css-rules.spec.util.ts';

const WIDGET_PRESSED_SELECTOR = ".widget-button[aria-pressed='true']";

const WIDGET_HOVER_SELECTOR = '.widget-button:hover';

const SHORTHAND_PATTERN = /(^|[;\s])background:/;

/** Prettier may wrap the chain, so whitespace is free between its parts. */
const BORDER_PATTERN = /border-color:\s*var\(\s*--vscode-inputOption-activeBorder,\s*var\(--vscode-widget-border,/;

const ruleStartOf = (selector: string): number => ruleOf(css, selector)?.index ?? -1;

describe('FEATURE: graph.css widget rules', () => {
  describe('GIVEN the pressed widget button rule', () => {
    it.each(['--tc-widget-fill: var(--vscode-inputOption-activeBackground', 'color: var(--vscode-inputOption-activeForeground)'])(
      'WHEN it is read THEN it holds %s',
      (expected) => {
        const declarations = declarationsOf(css, WIDGET_PRESSED_SELECTOR);

        expect(declarations).toContain(expected);
      }
    );

    it('WHEN it is read THEN it borders in activeBorder, falling back to the widget border', () => {
      const declarations = declarationsOf(css, WIDGET_PRESSED_SELECTOR);

      expect(declarations).toMatch(BORDER_PATTERN);
    });

    it('WHEN it is read THEN it sets no background shorthand, so the opaque base stays', () => {
      const declarations = declarationsOf(css, WIDGET_PRESSED_SELECTOR);

      expect(declarations).not.toBe('');
      expect(declarations).not.toMatch(SHORTHAND_PATTERN);
    });

    it('WHEN its place is compared with .widget-button:hover THEN it comes later', () => {
      const hoverStart = ruleStartOf(WIDGET_HOVER_SELECTOR);

      const pressedStart = ruleStartOf(WIDGET_PRESSED_SELECTOR);

      expect(hoverStart).toBeGreaterThan(-1);
      expect(pressedStart).toBeGreaterThan(hoverStart);
    });

    it.each(['.vscode-high-contrast', '.vscode-high-contrast-light'])(
      'WHEN the %s rule is read THEN an inner activeBorder ring marks it',
      (themeClass) => {
        const declarations = declarationsOf(css, `${themeClass} ${WIDGET_PRESSED_SELECTOR}`);

        expect(declarations).toContain('box-shadow: inset 0 0 0 1px var(--vscode-inputOption-activeBorder)');
      }
    );
  });
});
