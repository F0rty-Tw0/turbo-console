import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ACTION_ICONS, GRAPH_ICON_IDS } from './graph-icon.const.ts';
import { OVERLAY_MEDIA_QUERY } from './graph.const.ts';

const CODICON_CSS_PATH = join(import.meta.dirname, '../../../node_modules/@vscode/codicons/dist/codicon.css');

describe('FEATURE: graph icon ids', () => {
  describe('GIVEN the icon id list', () => {
    it('WHEN it is counted THEN it holds 34 ids: the 18 spec ids, the export download, the Tasks mode and the five run state icons, the folder glyph, the Packages mode and Clear selection icons, and the six action icons', () => {
      const count = GRAPH_ICON_IDS.length;

      expect(count).toBe(34);
    });

    it('WHEN eye-closed is looked up THEN it is in the list', () => {
      const hasEyeClosed = GRAPH_ICON_IDS.includes('eye-closed');

      expect(hasEyeClosed).toBe(true);
    });

    it.each(['type-hierarchy', 'clear-all'] as const)('WHEN %s, a U3 toolbar icon, is looked up THEN it is in the list', (id) => {
      const hasId = GRAPH_ICON_IDS.includes(id);

      expect(hasId).toBe(true);
    });

    it('WHEN tasklist, the Task mode icon, is looked up THEN it is in the list', () => {
      const hasTasklist = GRAPH_ICON_IDS.includes('tasklist');

      expect(hasTasklist).toBe(true);
    });
  });

  describe('GIVEN the action icon table', () => {
    it('WHEN it is read THEN it maps the D10 keys to the D10 icons', () => {
      const table = ACTION_ICONS;

      expect(table).toStrictEqual({
        openDetails: 'file-text',
        focus: 'target',
        clearFocus: 'close',
        startTrace: 'git-commit',
        showTasks: 'tasklist',
        exclude: 'eye-closed',
        showAll: 'eye',
        collapse: 'fold',
        expand: 'unfold',
        run: 'play',
        runNoCache: 'debug-rerun',
        stop: 'debug-stop'
      });
    });

    it.each(Object.entries(ACTION_ICONS))('WHEN %s -> %s is looked up THEN the icon is in the id list', (_key, id) => {
      const hasId = GRAPH_ICON_IDS.includes(id);

      expect(hasId).toBe(true);
    });
  });

  describe('GIVEN the shipped Codicon stylesheet', () => {
    const css = readFileSync(CODICON_CSS_PATH, 'utf8');

    it.each(GRAPH_ICON_IDS)('WHEN %s is looked up THEN the stylesheet draws it', (id) => {
      const selector = `.codicon-${id}:before`;

      const hasRule = css.includes(selector);

      expect(hasRule).toBe(true);
    });
  });

  it('GIVEN the overlay media query WHEN it is read THEN it overlays below 960 px', () => {
    const query = OVERLAY_MEDIA_QUERY;

    expect(query).toBe('(width < 960px)');
  });
});
