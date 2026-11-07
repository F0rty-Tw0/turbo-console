import { describe, expect, it } from 'vitest';

import { css, declarationsOf, ruleOf, ruleStartOf } from './test/utils/graph-css-rules.spec.util.ts';

type DeclarationRow = {
  readonly label: string;
  readonly selector: string;
  readonly expected: string;
};

const ARIA_DISABLED = ".icon-button[aria-disabled='true']";

const PAINTED_SELECTORS = ['.import-row', '.import-row:hover', '.import-tag'];

const PAINT_PATTERN = /(?:^|[;\s])(?:color|background|border)\s*:\s*([^;]+)/g;

const INHERIT = 'inherit';

const SIDE_BORDER_PATTERN = /border-(left|inline-start)/;

const paintValuesOf = (selector: string): string[] => {
  const declarations = declarationsOf(css, selector);
  const matches = Array.from(declarations.matchAll(PAINT_PATTERN));
  const values = matches.map((match) => match[1] ?? '');

  return values.map((value) => value.trim());
};

const isRawColour = (value: string): boolean => value.includes('#') || value.includes('rgb');

const isTokenValue = (value: string): boolean => {
  const isVariable = value.includes('var(--');
  const isAllowed = isVariable || value === INHERIT;

  return isAllowed && !isRawColour(value);
};

const DECLARATION_ROWS: DeclarationRow[] = [
  { label: 'the block lays out in a flex box', selector: '.details-imports-block', expected: 'display: flex' },
  { label: 'the block stacks its children in a flex column', selector: '.details-imports-block', expected: 'flex-direction: column' },
  {
    label: 'the block keeps buttons at their own width',
    selector: '.details-imports-block',
    expected: 'align-items: flex-start'
  },
  { label: 'the block spaces its children', selector: '.details-imports-block', expected: 'gap: var(--space-1)' },
  { label: 'the header spans the block', selector: '.details-imports-header', expected: 'width: 100%' },
  { label: 'a row spans the block', selector: '.import-row', expected: 'width: 100%' },
  { label: 'the header lays out in a flex row', selector: '.details-imports-header', expected: 'display: flex' },
  {
    label: 'the header pushes Scan again to the end',
    selector: '.details-imports-header',
    expected: 'justify-content: space-between'
  },
  { label: 'the tags wrap below the text', selector: '.import-tags', expected: 'flex-basis: 100%' },
  { label: 'a disabled Scan again shows the default cursor', selector: ARIA_DISABLED, expected: 'cursor: default' },
  { label: 'a hovered disabled Scan again keeps no fill', selector: `${ARIA_DISABLED}:hover`, expected: 'background: none' }
];

describe('FEATURE: graph.css imports block rules', () => {
  describe('GIVEN the imports block rules', () => {
    it.each(DECLARATION_ROWS)('WHEN $label THEN $selector holds $expected', ({ selector, expected }) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).toContain(expected);
    });
  });

  describe('GIVEN the painted rules of a row and a tag', () => {
    it.each(PAINTED_SELECTORS)('WHEN %s is looked up THEN the rule exists', (selector) => {
      const rule = ruleOf(css, selector);

      expect(rule).toBeDefined();
    });

    it.each(PAINTED_SELECTORS)(
      'WHEN the colours of %s are read THEN each is a theme variable or inherit with no raw colour',
      (selector) => {
        const values = paintValuesOf(selector);
        const rejected = values.filter((value) => !isTokenValue(value));

        expect(values.length).toBeGreaterThan(0);
        expect(rejected).toStrictEqual([]);
      }
    );

    it.each(['.import-row', '.import-tag'])('WHEN %s is read THEN it draws no side border', (selector) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).not.toMatch(SIDE_BORDER_PATTERN);
    });
  });

  describe('GIVEN the disabled Scan again rule', () => {
    it('WHEN it is read THEN it sets no opacity, the global aria-disabled rule dims it once', () => {
      const declarations = declarationsOf(css, ARIA_DISABLED);

      expect(declarations).not.toContain('opacity');
    });
  });

  describe('GIVEN the disabled Scan again hover rule', () => {
    it('WHEN its place is compared with the gated hover rule THEN it comes later and wins', () => {
      const hoverStart = ruleStartOf('.icon-button:hover:not(:disabled)');
      const disabledHoverStart = ruleStartOf(`${ARIA_DISABLED}:hover`);

      expect(hoverStart).toBeGreaterThan(-1);
      expect(disabledHoverStart).toBeGreaterThan(hoverStart);
    });
  });
});
