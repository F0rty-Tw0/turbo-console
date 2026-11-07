import { describe, expect, it } from 'vitest';

import { css, declarationsOf, ruleOf } from './test/utils/graph-css-rules.spec.util.ts';

type DeclarationRow = {
  readonly label: string;
  readonly selector: string;
  readonly expected: string;
};

const ARIA_DISABLED = ".icon-button[aria-disabled='true']";

const PAINTED_SELECTORS = ['.import-row', '.import-row:hover', '.import-tag'];

const PAINT_PATTERN = /(?:^|[;\s])(?:color|background|border)\s*:\s*([^;]+)/g;

const INHERIT = 'inherit';

const ruleStartOf = (selector: string): number => ruleOf(css, selector)?.index ?? -1;

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
  { label: 'the header lays out in a flex row', selector: '.details-imports-header', expected: 'display: flex' },
  {
    label: 'the header pushes Scan again to the end',
    selector: '.details-imports-header',
    expected: 'justify-content: space-between'
  },
  { label: 'a row text wraps anywhere', selector: '.import-text', expected: 'overflow-wrap: anywhere' },
  {
    label: 'a file path wraps anywhere',
    selector: '.details-imports-block .details-file .details-code',
    expected: 'overflow-wrap: anywhere'
  },
  { label: 'the tags wrap below the text', selector: '.import-tags', expected: 'flex-basis: 100%' },
  { label: 'a disabled Scan again dims', selector: ARIA_DISABLED, expected: 'opacity: 0.5' },
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

    it.each(PAINTED_SELECTORS)('WHEN the colours of %s are read THEN each is a theme variable with no raw colour', (selector) => {
      const values = paintValuesOf(selector);
      const rejected = values.filter((value) => !isTokenValue(value));

      expect(values.length).toBeGreaterThan(0);
      expect(rejected).toStrictEqual([]);
    });

    it.each(['.import-row', '.import-tag'])('WHEN %s is read THEN it draws no side border', (selector) => {
      const declarations = declarationsOf(css, selector);

      expect(declarations).not.toContain('border-left');
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
