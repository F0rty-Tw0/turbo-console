import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { GRAPH_ICON_IDS } from './graph-icon.const.ts';
import { OVERLAY_MEDIA_QUERY } from './graph.const.ts';

const CODICON_CSS_PATH = join(import.meta.dirname, '../../../node_modules/@vscode/codicons/dist/codicon.css');

describe('FEATURE: graph icon ids', () => {
  describe('GIVEN the icon id list', () => {
    it('WHEN it is counted THEN it holds the 18 spec ids, the menu check and dash, the export download and the task mode toggle', () => {
      const count = GRAPH_ICON_IDS.length;

      expect(count).toBe(22);
    });

    it('WHEN eye-closed is looked up THEN it is in the list', () => {
      const hasEyeClosed = GRAPH_ICON_IDS.includes('eye-closed');

      expect(hasEyeClosed).toBe(true);
    });

    it('WHEN tasklist, the Task mode icon, is looked up THEN it is in the list', () => {
      const hasTasklist = GRAPH_ICON_IDS.includes('tasklist');

      expect(hasTasklist).toBe(true);
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
