import { describe, expect, it } from 'vitest';

import { safeColorVar, safeIconId } from './run-view.util.ts';

describe('FEATURE: run view values from the host', () => {
  describe('GIVEN an icon id', () => {
    it.each([['play'], ['debug-stop'], ['pass-filled'], ['circle-large-outline'], ['x1']])(
      'WHEN it is the codicon id %s THEN it is kept',
      (iconId) => {
        expect(safeIconId(iconId)).toBe(iconId);
      }
    );

    it.each([
      ['empty', ''],
      ['two words', 'a b'],
      ['uppercase', 'Play'],
      ['a leading dash', '-play'],
      ['a trailing dash', 'play-'],
      ['a double dash', 'debug--stop'],
      ['markup', '<img>'],
      ['a quote', 'a"b'],
      ['a trailing newline', 'play\n']
    ])('WHEN it has %s THEN it is dropped', (_label, iconId) => {
      expect(safeIconId(iconId)).toBeNull();
    });
  });

  describe('GIVEN a color variable', () => {
    it.each([['--vscode-testing-iconPassed'], ['--vscode-charts.green'], ['--vscode-errorForeground']])(
      'WHEN it is the theme variable %s THEN it is kept',
      (colorVar) => {
        expect(safeColorVar(colorVar)).toBe(colorVar);
      }
    );

    it.each([
      ['no variable', null],
      ['a CSS escape', '--x) url(https://e/'],
      ['a non-vscode variable', '--x'],
      ['a bare prefix', '--vscode-'],
      ['a color name', 'red'],
      ['a space', '--vscode-a b'],
      ['a closing paren', '--vscode-a)'],
      ['a trailing newline', '--vscode-a\n']
    ])('WHEN it is %s THEN it is dropped', (_label, colorVar) => {
      expect(safeColorVar(colorVar)).toBeNull();
    });
  });
});
