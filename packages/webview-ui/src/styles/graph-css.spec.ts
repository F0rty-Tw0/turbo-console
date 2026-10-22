import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { OVERLAY_MEDIA_QUERY } from '../graph/common/graph.const.ts';

const RULE_PATTERN = /([^{}]+)\{([^{}]*)\}/g;

const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;

const COLOUR_LITERAL_PATTERN = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i;

const MUTED_TOKEN = '--tc-muted: color-mix(in srgb, var(--vscode-foreground) 75%, var(--vscode-editor-background));';

const PRESSED_SELECTOR = ".graph-toolbar .text-button[aria-expanded='true']";

const HOVER_SELECTOR = '.text-button:hover:not(:disabled)';

const rawCss = readFileSync(join(import.meta.dirname, 'graph.css'), 'utf8');

const css = rawCss.replace(COMMENT_PATTERN, '');

const selectorOf = (match: RegExpExecArray): string => {
  const selector = match[1] ?? '';

  return selector.trim().replace(/\s+/g, ' ');
};

const bodyOf = (match: RegExpExecArray): string => match[2] ?? '';

const hasSelector = (rule: RegExpExecArray, selector: string): boolean => {
  const list = selectorOf(rule);
  const selectors = list.split(/\s*,\s*/);

  return selectors.includes(selector);
};

/** The first rule whose selector list holds exactly `selector`, ignoring whitespace. */
const ruleOf = (text: string, selector: string): RegExpExecArray | undefined => {
  const matches = text.matchAll(RULE_PATTERN);
  const rules = Array.from(matches);

  return rules.find((rule) => hasSelector(rule, selector));
};

const declarationsOf = (text: string, selector: string): string => {
  const rule = ruleOf(text, selector);

  if (rule === undefined) return '';

  return bodyOf(rule);
};

const ruleStartOf = (selector: string): number => ruleOf(css, selector)?.index ?? -1;

describe('FEATURE: graph.css', () => {
  it('GIVEN the :root rule WHEN it is read THEN it defines the muted token', () => {
    const declarations = declarationsOf(css, ':root');

    expect(declarations).toContain(MUTED_TOKEN);
  });

  it('GIVEN the body rule WHEN it is read THEN it drops the webview default padding so the panels meet the editor edges', () => {
    const rules = Array.from(css.matchAll(RULE_PATTERN));
    const body = rules.find((rule) => selectorOf(rule) === 'body');

    expect(body?.[2]).toContain('padding: 0;');
  });

  describe('GIVEN the controls panel rule', () => {
    const declarations = declarationsOf(css, '.graph-controls');

    it.each(['flex: 0 0 260px', 'box-sizing: border-box'])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the details panel rule', () => {
    const declarations = declarationsOf(css, '.graph-details');

    it.each([
      'flex: 0 0 280px',
      'box-sizing: border-box',
      'var(--vscode-sideBar-background)',
      'var(--vscode-sideBar-foreground)',
      'border-inline-start: 1px solid var(--vscode-panel-border)'
    ])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the overlay media block', () => {
    const start = css.indexOf(`@media ${OVERLAY_MEDIA_QUERY}`);
    const overlay = css.slice(start);
    const declarations = declarationsOf(overlay, '.graph-details');

    it('WHEN the css is searched THEN the block exists', () => {
      expect(start).toBeGreaterThan(-1);
    });

    it.each(['position: absolute', 'width: 280px', 'var(--vscode-widget-shadow)'])(
      'WHEN its details rule is read THEN it holds %s',
      (expected) => {
        expect(declarations).toContain(expected);
      }
    );

    it('WHEN the body rule is read THEN the body positions the overlay', () => {
      const body = declarationsOf(css, '.graph-body');

      expect(body).toContain('position: relative');
    });
  });

  describe('GIVEN the pressed toggle rule', () => {
    it.each(['activeForeground', 'activeBackground', 'activeBorder'])('WHEN it is read THEN it uses inputOption-%s', (name) => {
      const declarations = declarationsOf(css, PRESSED_SELECTOR);

      expect(declarations).toContain(`var(--vscode-inputOption-${name}`);
    });

    it.each(['.vscode-high-contrast', '.vscode-high-contrast-light'])(
      'WHEN the %s rule is read THEN an inner activeBorder ring marks it',
      (themeClass) => {
        const declarations = declarationsOf(css, `${themeClass} ${PRESSED_SELECTOR}`);

        expect(declarations).toContain('box-shadow: inset 0 0 0 1px var(--vscode-inputOption-activeBorder)');
      }
    );

    it('WHEN its place is compared with the hover rule THEN it comes later and wins', () => {
      const hoverStart = ruleStartOf(HOVER_SELECTOR);

      const pressedStart = ruleStartOf(PRESSED_SELECTOR);

      expect(hoverStart).toBeGreaterThan(-1);
      expect(pressedStart).toBeGreaterThan(hoverStart);
    });
  });

  describe('GIVEN the toolbar separator rule', () => {
    const declarations = declarationsOf(css, '.toolbar-separator');

    it.each(['width: 1px', 'height: 16px', 'var(--vscode-panel-border)'])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  it('GIVEN the filters-on rule WHEN it is read THEN it uses the info foreground', () => {
    const declarations = declarationsOf(css, '.filters-on');

    expect(declarations).toContain('var(--vscode-editorInfo-foreground)');
  });

  describe('GIVEN the kbd rule', () => {
    const declarations = declarationsOf(css, 'kbd');

    it.each(['background', 'foreground', 'border', 'bottomBorder'])('WHEN it is read THEN it uses keybindingLabel-%s', (name) => {
      expect(declarations).toContain(`var(--vscode-keybindingLabel-${name})`);
    });
  });

  describe('GIVEN the details panel views', () => {
    it.each([
      ['.excerpt-row.is-entry', 'var(--vscode-editor-selectionBackground)'],
      ['.excerpt-row.is-entry', 'var(--vscode-editor-selectionForeground, var(--vscode-editor-foreground))'],
      ['.excerpt-number', 'var(--vscode-editorLineNumber-foreground)'],
      ['.icon-warning', 'var(--vscode-list-warningForeground, var(--vscode-editorWarning-foreground))'],
      ['.icon-info', 'var(--vscode-editorInfo-foreground)'],
      ['.details-lead', 'var(--tc-muted)'],
      ['.primary-button', 'var(--vscode-button-background)'],
      ['.details-tag', 'var(--vscode-badge-background)'],
      ['.graph-hint', 'pointer-events: none'],
      ['.graph-hint', 'position: absolute']
    ])('WHEN the %s rule is read THEN it holds %s', (selector, expected) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the whole stylesheet', () => {
    it('WHEN it is searched THEN the old filters dot is gone', () => {
      const hasDot = rawCss.includes('has-filters');

      expect(hasDot).toBe(false);
    });

    it('WHEN every declaration block is scanned THEN none holds a colour literal', () => {
      const matches = css.matchAll(RULE_PATTERN);
      const bodies = Array.from(matches, bodyOf);

      const literalBodies = bodies.filter((body) => COLOUR_LITERAL_PATTERN.test(body));

      expect(literalBodies).toStrictEqual([]);
    });
  });
});
