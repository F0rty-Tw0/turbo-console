import { describe, expect, it } from 'vitest';

import { css, declarationsOf, ruleOf } from './test/utils/graph-css-rules.spec.util.ts';

const WIDGET_SELECTOR = '.widget-button';

const WIDGET_PRESSED_SELECTOR = ".widget-button[aria-pressed='true']";

const WIDGET_HOVER_SELECTOR = '.widget-button:hover';

const SHORTHAND_PATTERN = /(^|[;\s])background:/;

/** Prettier may wrap the chain, so whitespace is free between its parts. */
const BORDER_PATTERN = /border-color:\s*var\(\s*--vscode-inputOption-activeBorder,\s*var\(--tc-widget-border\)/;

/** Prettier may wrap the chain, so whitespace is free between its parts. */
const BORDER_CHAIN_PATTERN = /--tc-widget-border:\s*var\(\s*--vscode-widget-border,\s*var\(--vscode-contrastBorder,/;

const ruleStartOf = (selector: string): number => ruleOf(css, selector)?.index ?? -1;

describe('FEATURE: graph.css widget rules', () => {
  describe('GIVEN the widget button rule', () => {
    it('WHEN it is read THEN it declares the border chain once as --tc-widget-border and draws its border from it', () => {
      const declarations = declarationsOf(css, WIDGET_SELECTOR);

      expect(declarations).toMatch(BORDER_CHAIN_PATTERN);
      expect(declarations).toContain('border: 1px solid var(--tc-widget-border)');
    });
  });

  describe('GIVEN the pressed widget button rule', () => {
    it.each([
      '--tc-widget-fill: var(--vscode-inputOption-activeBackground',
      'color: var(--vscode-inputOption-activeForeground, var(--vscode-button-secondaryForeground))'
    ])('WHEN it is read THEN it holds %s', (expected) => {
      const declarations = declarationsOf(css, WIDGET_PRESSED_SELECTOR);

      expect(declarations).toContain(expected);
    });

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

  describe('GIVEN the node toolbar rule', () => {
    it.each(['position: absolute', 'display: flex', 'gap: 4px', 'pointer-events: none'])(
      'WHEN it is read THEN it declares %s',
      (expected) => {
        const declarations = declarationsOf(css, '.widget-toolbar');

        expect(declarations).toContain(expected);
      }
    );

    it('WHEN the task-mode hiding rule is read THEN it lists the package toolbar', () => {
      const declarations = declarationsOf(css, '.task-mode .widget-toolbar-package');

      expect(declarations).toContain('display: none');
    });
  });
});
