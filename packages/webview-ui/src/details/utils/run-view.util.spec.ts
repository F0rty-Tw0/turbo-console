import { describe, expect, it } from 'vitest';

import { runText, safeColorVar, safeIconId } from './run-view.util.ts';
import type { RunView } from '../../bridge/common/details-state.type.ts';
import { RUN_VIEW_STUB } from '../test/stubs/details.stub.ts';

const NOT_IDLE_VIEW: RunView = { ...RUN_VIEW_STUB, isIdle: false };

const RUNNING_VIEW: RunView = { ...NOT_IDLE_VIEW, iconId: 'sync', text: 'running', isRunning: true, elapsedMs: 0, isSpinning: true };

const PASSED_VIEW: RunView = { ...NOT_IDLE_VIEW, iconId: 'pass', text: '3.2s · cached' };

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
    it.each([['--vscode-testing-iconPassed'], ['--vscode-charts-green'], ['--vscode-errorForeground']])(
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
      ['a dot', '--vscode-charts.green'],
      ['a trailing newline', '--vscode-a\n']
    ])('WHEN it is %s THEN it is dropped', (_label, colorVar) => {
      expect(safeColorVar(colorVar)).toBeNull();
    });
  });

  describe('GIVEN a run view and the page time since it arrived', () => {
    it('WHEN the run has ended THEN the text is the host text alone', () => {
      expect(runText(PASSED_VIEW, 5000)).toBe('3.2s · cached');
    });

    it.each([
      [0, 0, 'running · 0s'],
      [0, 1999, 'running · 1s'],
      [12_345, 0, 'running · 12s'],
      [59_000, 1000, 'running · 1m 0s']
    ])('WHEN it ran %d ms at the host and %d ms since THEN the text is %s', (elapsedMs, sinceReceivedMs, text) => {
      const run: RunView = { ...RUNNING_VIEW, elapsedMs };

      expect(runText(run, sinceReceivedMs)).toBe(text);
    });
  });
});
