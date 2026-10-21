import { describe, expect, it } from 'vitest';

import { themeColorsOf } from './theme-colors.util.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { cssVariableReaderMock } from '../test/mocks/css-variable-reader.mock.ts';

const DARK: Record<string, string> = {
  '--vscode-editor-background': '#1f1f1f',
  '--vscode-foreground': '#cccccc',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-focusBorder': '#0078d4',
  '--vscode-charts-blue': '#3794ff',
  '--vscode-contrastBorder': '',
  '--vscode-panel-border': '#2b2b2b'
};

const DARK_COLORS: ThemeColors = {
  background: '#1f1f1f',
  label: '#cccccc',
  edge: '#9d9d9d',
  selected: '#0078d4',
  highlighted: '#3794ff',
  frame: '#2b2b2b'
};

describe('FEATURE: themeColorsOf', () => {
  describe('GIVEN a dark theme with no contrast border', () => {
    it('WHEN the colours are read THEN each comes from its theme variable and the frame from panel-border', () => {
      const colors = themeColorsOf(cssVariableReaderMock(DARK));

      expect(colors).toStrictEqual(DARK_COLORS);
    });

    it('WHEN the colours are read THEN only the seven theme variables are read', () => {
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

  it('GIVEN a blank contrast border WHEN the colours are read THEN panel-border is the frame', () => {
    const blankBorder = { ...DARK, '--vscode-contrastBorder': '   ' };

    const colors = themeColorsOf(cssVariableReaderMock(blankBorder));

    expect(colors.frame).toBe('#2b2b2b');
  });

  it('GIVEN every variable blank WHEN the colours are read THEN they are the fallback colours', () => {
    const colors = themeColorsOf(cssVariableReaderMock({}));

    expect(colors).toStrictEqual(FALLBACK_COLORS);
  });

  it('GIVEN a value with surrounding spaces WHEN the colours are read THEN it is trimmed', () => {
    const padded = { ...DARK, '--vscode-foreground': '  #fff ' };

    const colors = themeColorsOf(cssVariableReaderMock(padded));

    expect(colors.label).toBe('#fff');
  });
});
