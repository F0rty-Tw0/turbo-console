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

const ICON_PRESSED_SELECTOR = ".icon-button[aria-pressed='true']:not(:disabled)";

const ICON_HOVER_SELECTOR = '.icon-button:hover:not(:disabled)';

const PACKAGE_ROW_SELECTOR = ".details-view[data-view='package'] .details-row";

/** The last shown button on an odd place: `of S` skips a hidden Show tasks. */
const ORPHAN_SELECTOR = `${PACKAGE_ROW_SELECTOR} > :nth-last-child(1 of :not([hidden])):nth-child(odd of :not([hidden]))`;

const NARROW_ICON_SELECTOR = `${PACKAGE_ROW_SELECTOR} .codicon`;

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

    it.each(['flex: 0 0 var(--tc-controls-width)', 'box-sizing: border-box'])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the details panel rule', () => {
    const declarations = declarationsOf(css, '.graph-details');

    it.each([
      'flex: 0 0 var(--tc-details-width)',
      'box-sizing: border-box',
      'var(--vscode-sideBar-background)',
      'var(--vscode-sideBar-foreground)',
      'border-inline-start: 1px solid var(--vscode-panel-border)'
    ])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the details action row rules', () => {
    it.each([
      ['.details-row', 'grid-template-columns: repeat(3, minmax(0, 1fr))'],
      [PACKAGE_ROW_SELECTOR, 'grid-template-columns: repeat(2, minmax(0, 1fr))'],
      [ORPHAN_SELECTOR, 'grid-column: 1 / -1'],
      [NARROW_ICON_SELECTOR, 'display: none']
    ])('WHEN the %s rule is read THEN it holds %s', (selector, expected) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).toContain(expected);
    });

    it('WHEN the narrow icon rule is placed THEN it sits in the narrow container block', () => {
      const narrowStart = css.indexOf('@container (width < 240px)');

      expect(narrowStart).toBeGreaterThan(-1);
      expect(ruleStartOf(NARROW_ICON_SELECTOR)).toBeGreaterThan(narrowStart);
    });
  });

  describe('GIVEN the panel width variables', () => {
    it.each([
      ['@property --tc-controls-width', 'initial-value: 260px'],
      ['@property --tc-details-width', 'initial-value: 280px'],
      ['@property --tc-controls-width', 'inherits: false'],
      ['@property --tc-details-width', 'inherits: false'],
      ['.graph-controls', '--tc-controls-width: inherit'],
      ['.graph-details', '--tc-details-width: inherit'],
      ['.graph-sash-controls', '--tc-controls-width: inherit'],
      ['.graph-sash-details', '--tc-details-width: inherit']
    ])('WHEN %s is read THEN it holds %s', (selector, expected) => {
      expect(declarationsOf(css, selector)).toContain(expected);
    });
  });

  describe('GIVEN the sash rules', () => {
    it.each(['cursor: col-resize', 'z-index: 3', 'display: none'])('WHEN .graph-sash is read THEN it holds %s', (expected) => {
      expect(declarationsOf(css, '.graph-sash')).toContain(expected);
    });

    it.each([
      ['.graph-sash:focus-visible::after', 'width: 2px'],
      ['.vscode-high-contrast .graph-sash:focus-visible', 'outline: 1px solid var(--vscode-contrastActiveBorder)'],
      ['.graph-body.is-sashing', 'cursor: col-resize']
    ])('WHEN %s is read THEN it holds %s', (selector, expected) => {
      expect(declarationsOf(css, selector)).toContain(expected);
    });

    it('WHEN the hover line is read THEN it uses sash.hoverBorder with the focus border fallback', () => {
      expect(declarationsOf(css, '.graph-sash:hover::after')).toContain('var(--vscode-sash-hoverBorder, var(--vscode-focusBorder))');
    });
  });

  describe('GIVEN the overlay media block', () => {
    const start = css.indexOf(`@media ${OVERLAY_MEDIA_QUERY}`);
    const overlay = css.slice(start);
    const declarations = declarationsOf(overlay, '.graph-details');

    it('WHEN the css is searched THEN the block exists', () => {
      expect(start).toBeGreaterThan(-1);
    });

    it.each(['position: absolute', 'width: var(--tc-details-width)', 'var(--vscode-widget-shadow)'])(
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

  describe('GIVEN the icon button rules', () => {
    it('WHEN the disabled rule is read THEN it dims the button', () => {
      const declarations = declarationsOf(css, '.icon-button:disabled');

      expect(declarations).toContain('opacity: 0.5');
    });

    it('WHEN the hover rule is read THEN it is gated on enabled and uses toolbar-hoverBackground', () => {
      const declarations = declarationsOf(css, '.icon-button:hover:not(:disabled)');

      expect(declarations).toContain('toolbar-hoverBackground');
    });

    it('WHEN the ungated hover selector is looked up THEN no rule has it', () => {
      const ungatedStart = ruleStartOf('.icon-button:hover');

      expect(ungatedStart).toBe(-1);
    });
  });

  describe('GIVEN the pressed mode button rule', () => {
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

  describe('GIVEN the pressed icon button rule', () => {
    it.each(['activeForeground', 'activeBackground'])('WHEN it is read THEN it uses inputOption-%s', (name) => {
      const declarations = declarationsOf(css, ICON_PRESSED_SELECTOR);

      expect(declarations).toContain(`var(--vscode-inputOption-${name}`);
    });

    it('WHEN its place is compared with the gated hover rule THEN it comes later and wins', () => {
      const hoverStart = ruleStartOf(ICON_HOVER_SELECTOR);

      const pressedStart = ruleStartOf(ICON_PRESSED_SELECTOR);

      expect(hoverStart).toBeGreaterThan(-1);
      expect(pressedStart).toBeGreaterThan(hoverStart);
    });

    it.each(['.vscode-high-contrast', '.vscode-high-contrast-light'])(
      'WHEN the %s rule is read THEN an inner activeBorder ring marks it',
      (themeClass) => {
        const declarations = declarationsOf(css, `${themeClass} .icon-button[aria-pressed='true']`);

        expect(declarations).toContain('box-shadow: inset 0 0 0 1px var(--vscode-inputOption-activeBorder)');
      }
    );
  });

  describe('GIVEN the toolbar separator rule', () => {
    const declarations = declarationsOf(css, '.toolbar-separator');

    it.each(['width: 1px', 'height: 16px', 'var(--vscode-panel-border)'])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the legend panel rule', () => {
    const declarations = declarationsOf(css, '.graph-legend');

    it.each([
      'background: var(--vscode-menu-background)',
      'color: var(--vscode-menu-foreground, var(--vscode-foreground))',
      'box-shadow: 0 2px 8px var(--vscode-widget-shadow)',
      'max-height: 70vh',
      'overflow: auto'
    ])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });

    it('WHEN it is read THEN it sets no display, which would show the closed popover', () => {
      expect(declarations).not.toContain('display');
    });
  });

  describe('GIVEN the @supports anchor block', () => {
    const start = css.indexOf('@supports (anchor-name: --graph-legend)');
    const anchored = css.slice(start);

    it('WHEN the css is searched THEN the block exists', () => {
      expect(start).toBeGreaterThan(-1);
    });

    it('WHEN its button rule is read THEN it names the anchor', () => {
      const declarations = declarationsOf(anchored, '.legend-button');

      expect(declarations).toContain('anchor-name: --graph-legend');
    });

    it.each(['position-anchor: --graph-legend', 'top: calc(anchor(bottom) + var(--space-1))', 'position-try-fallbacks: flip-inline'])(
      'WHEN its panel rule is read THEN it holds %s',
      (expected) => {
        const declarations = declarationsOf(anchored, '.graph-legend');

        expect(declarations).toContain(expected);
      }
    );
  });

  it.each(['.graph-page.task-mode .legend-packages', '.graph-page:not(.task-mode) .legend-tasks'])(
    'GIVEN the mode rule WHEN %s is read THEN that list is hidden',
    (selector) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).toContain('display: none');
    }
  );

  describe('GIVEN the empty task notice rule', () => {
    const declarations = declarationsOf(css, '.graph-task-notice:empty');

    it.each(['margin: 0', 'padding: 0', 'border: 0'])('WHEN it is read THEN it holds %s', (expected) => {
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
      ['.graph-hint', 'position: absolute'],
      ['.graph-flow', 'position: absolute'],
      ['.graph-flow', 'z-index: 1'],
      ['.graph-flow', 'pointer-events: none'],
      ['.widget-button', 'var(--vscode-contrastBorder, color-mix(in srgb, var(--vscode-foreground) 35%, transparent))'],
      ['.widget-button', 'background-color: var(--vscode-editor-background)'],
      ['.widget-button', 'background-image: linear-gradient(var(--tc-widget-fill), var(--tc-widget-fill))'],
      ['.widget-button', '--tc-widget-fill: var(--vscode-button-secondaryBackground, transparent)'],
      ['.widget-button:hover', '--tc-widget-fill: var(--vscode-button-secondaryHoverBackground, transparent)']
    ])('WHEN the %s rule is read THEN it holds %s', (selector, expected) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the location bar rule', () => {
    const declarations = declarationsOf(css, '.graph-location');

    it.each(['display: flex', 'flex-direction: column'])('WHEN it is read THEN it holds %s', (expected) => {
      expect(declarations).toContain(expected);
    });

    it('WHEN the hidden rule is read THEN it still wins over the flex display', () => {
      expect(declarationsOf(css, '[hidden]')).toContain('display: none !important');
    });
  });

  describe('GIVEN the whole stylesheet', () => {
    it('WHEN it is searched THEN the floating breadcrumb and its task mode hide rule are gone', () => {
      const hasBreadcrumb = rawCss.includes('breadcrumb');

      expect(hasBreadcrumb).toBe(false);
    });

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
