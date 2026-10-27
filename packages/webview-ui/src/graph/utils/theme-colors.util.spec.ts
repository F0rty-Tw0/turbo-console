import { describe, expect, it } from 'vitest';

import { contrastRatioOf } from './contrast.util.ts';
import { themeColorsOf } from './theme-colors.util.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { SelectionColors, ThemeColors } from '../common/theme-colors.type.ts';
import { cssVariableReaderMock } from '../test/mocks/css-variable-reader.mock.ts';

const DARK: Record<string, string> = {
  '--vscode-editor-background': '#1f1f1f',
  '--vscode-foreground': '#cccccc',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-focusBorder': '#0078d4',
  '--vscode-charts-blue': '#3794ff',
  '--vscode-contrastBorder': '',
  '--vscode-panel-border': '#2b2b2b',
  '--vscode-charts-yellow': '#cca700',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f14c4c',
  '--vscode-errorForeground': '#f85149',
  '--vscode-charts-purple': '#b180d7',
  '--vscode-list-activeSelectionBackground': '#04395e',
  '--vscode-list-activeSelectionForeground': '#ffffff'
};

/** `THEME_HC_STUB`'s colours over the dark rows: white label and edges, the `#6fc3df` contrast border, a black editor. */
const HC_STUB: Record<string, string> = {
  ...DARK,
  '--vscode-editor-background': '#000000',
  '--vscode-foreground': '#ffffff',
  '--vscode-descriptionForeground': '#ffffff',
  '--vscode-contrastBorder': '#6fc3df'
};

/** `HC_STUB` as VS Code's High Contrast theme leaves it: no list selection colours. */
const HC_STUB_UNSELECTED: Record<string, string> = {
  ...HC_STUB,
  '--vscode-list-activeSelectionBackground': '',
  '--vscode-list-activeSelectionForeground': ''
};

const DARK_RUNS: ThemeColors['runs'] = {
  running: '#cca700',
  passed: '#73c991',
  failed: '#f14c4c',
  stopped: '#9d9d9d',
  'failed-to-start': '#f85149'
};

const DARK_SELECTION: SelectionColors = { fill: '#04395e', label: '#ffffff' };

const DARK_COLORS: ThemeColors = {
  background: '#1f1f1f',
  label: '#cccccc',
  edge: '#9d9d9d',
  selected: '#0078d4',
  highlighted: '#3794ff',
  frame: '#2b2b2b',
  cached: '#b180d7',
  runs: DARK_RUNS,
  selection: DARK_SELECTION,
  dimmedOpacity: 0.25
};

describe('FEATURE: themeColorsOf', () => {
  describe('GIVEN a dark theme with no contrast border', () => {
    it('WHEN the colours are read THEN each comes from its theme variable and the frame from panel-border', () => {
      const colors = themeColorsOf(cssVariableReaderMock(DARK));

      expect(colors).toStrictEqual(DARK_COLORS);
    });

    it('WHEN the colours are read THEN only the fourteen theme variables are read', () => {
      const read: string[] = [];

      themeColorsOf(cssVariableReaderMock(DARK, read));

      expect(new Set(read)).toStrictEqual(new Set(Object.keys(DARK)));
    });
  });

  it('GIVEN a high contrast theme WHEN the colours are read THEN the contrast border is the frame', () => {
    const highContrast = { ...DARK, '--vscode-contrastBorder': '#6fc3df' };

    const colors = themeColorsOf(cssVariableReaderMock(highContrast));

    expect(colors.frame).toBe('#6fc3df');
  });

  it('GIVEN no contrast border WHEN the colours are read THEN dimmed elements keep 0.25', () => {
    const colors = themeColorsOf(cssVariableReaderMock(DARK));

    expect(colors.dimmedOpacity).toBe(0.25);
  });

  it('GIVEN the high contrast stub WHEN the colours are read THEN dimmed elements rise to 0.55, where the frame reads 3.3:1', () => {
    const colors = themeColorsOf(cssVariableReaderMock(HC_STUB));

    expect(colors.dimmedOpacity).toBe(0.55);
  });

  it('GIVEN a blank contrast border WHEN the colours are read THEN panel-border is the frame', () => {
    const blankBorder = { ...DARK, '--vscode-contrastBorder': '   ' };

    const colors = themeColorsOf(cssVariableReaderMock(blankBorder));

    expect(colors.frame).toBe('#2b2b2b');
  });

  it('GIVEN every variable blank WHEN the colours are read THEN they are the fallback colours', () => {
    const colors = themeColorsOf(cssVariableReaderMock({}));

    expect(colors).toStrictEqual(FALLBACK_COLORS);
  });

  it.each([
    ['#9d9d9d80', 'rgba(157, 157, 157, 0.5)'],
    ['#ccc8', 'rgba(204, 204, 204, 0.53)']
  ])('GIVEN the stopped colour %s with alpha WHEN the colours are read THEN it reads as %s, which Cytoscape parses', (hex, rgba) => {
    const translucent = { ...DARK, '--vscode-descriptionForeground': hex };

    const colors = themeColorsOf(cssVariableReaderMock(translucent));

    expect(colors.runs.stopped).toBe(rgba);
  });

  it('GIVEN every variable blank WHEN the colours are read THEN stopped is the description fallback, as the edge is', () => {
    const colors = themeColorsOf(cssVariableReaderMock({}));

    expect(colors.runs.stopped).toBe('#717171');
    expect(colors.runs.stopped).toBe(colors.edge);
  });

  /** `descriptionForeground` is `transparent(foreground, 0.7)` in both high contrast themes, which set none. contrastRatioOf ignores alpha, so each is blended over its background first. Source: https://github.com/microsoft/vscode/blob/8d97209dc20dfbd60430243dbeac80149f87087a/src/vs/platform/theme/common/colors/baseColors.ts */
  const HC_DESCRIPTION = '#b3b3b3'; // foreground #FFFFFF: 0.7 * 255 + 0.3 * 0 = 178.5 over black
  const HC_LIGHT_DESCRIPTION = '#696969'; // foreground #292929: 0.7 * 41 + 0.3 * 255 = 105 over white

  /** Values from the VS Code 1.141 theme-defaults themes (descriptionForeground on editor.background, following `include`); High Contrast and High Contrast Light set neither descriptionForeground nor, for the latter, editor.background, so they take the baseColors defaults. */
  it.each([
    ['Light Modern', '#3b3b3b', '#ffffff'],
    ['Dark Modern', '#9d9d9d', '#1f1f1f'],
    ['High Contrast', HC_DESCRIPTION, '#000000'],
    ['High Contrast Light', HC_LIGHT_DESCRIPTION, '#ffffff'],
    ['Dark 2026', '#8c8c8c', '#121314'],
    ['Light 2026', '#606060', '#ffffff'],
    ['fallback (Light+ default)', '#717171', '#ffffff']
  ])('GIVEN %s, stopped (descriptionForeground) on the editor background is at least 3:1', (_, foreground, background) => {
    expect(contrastRatioOf(foreground, background)).toBeGreaterThanOrEqual(3);
  });

  describe('GIVEN a selection fill with alpha', () => {
    it.each([
      ['Dark 2026', '#FFFFFF22', '#121314', 'rgb(50, 50, 51)'],
      ['Light 2026', '#00000025', '#ffffff', 'rgb(218, 218, 218)'],
      ['Dark 2026 as VS Code hands it to a webview', 'rgba(255, 255, 255, 0.13)', '#121314', 'rgb(49, 50, 51)']
    ])('WHEN the %s fill %s over %s is read THEN it is the opaque %s', (_, fill, background, expected) => {
      const translucent = { ...DARK, '--vscode-list-activeSelectionBackground': fill, '--vscode-editor-background': background };

      const colors = themeColorsOf(cssVariableReaderMock(translucent));

      expect(colors.selection?.fill).toBe(expected);
    });
  });

  it.each([
    ['the fill', '--vscode-list-activeSelectionBackground'],
    ['the label', '--vscode-list-activeSelectionForeground']
  ])('GIVEN only %s of the selection blank WHEN the colours are read THEN there is no selection colour', (_, name) => {
    const halfSet = { ...DARK, [name]: '' };

    const colors = themeColorsOf(cssVariableReaderMock(halfSet));

    expect(colors.selection).toBeNull();
  });

  it('GIVEN both selection colours blank WHEN the colours are read THEN there is no selection colour', () => {
    const colors = themeColorsOf(cssVariableReaderMock(HC_STUB_UNSELECTED));

    expect(colors.selection).toBeNull();
  });

  it('GIVEN a value with surrounding spaces WHEN the colours are read THEN it is trimmed', () => {
    const padded = { ...DARK, '--vscode-foreground': '  #fff ' };

    const colors = themeColorsOf(cssVariableReaderMock(padded));

    expect(colors.label).toBe('#fff');
  });
});
