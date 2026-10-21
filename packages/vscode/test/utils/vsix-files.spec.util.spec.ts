import { describe, expect, it } from 'vitest';

import { vsixProblems } from './vsix-files.spec.util.ts';

const FULL_LIST = [
  'package.json',
  'dist/extension.cjs',
  'dist/webview/details/index.html',
  'dist/webview/details/main.js',
  'dist/webview/details/details.css',
  'dist/webview/details/codicon.css',
  'dist/webview/details/codicon.ttf',
  'dist/webview/details/LICENSE',
  'dist/webview/details/LICENSE-CODE',
  'dist/webview/details/tool-icons.ttf',
  'dist/webview/details/tool-icons.css',
  'dist/webview/details/TOOL-ICONS-NOTICE.md',
  'dist/webview/details/SIMPLE-ICONS-LICENSE.md',
  'dist/webview/details/SIMPLE-ICONS-DISCLAIMER.md',
  'dist/webview/graph/index.html',
  'dist/webview/graph/main.js'
];

describe('FEATURE: vsixProblems', () => {
  describe('GIVEN the full file list', () => {
    it('WHEN it is checked THEN there are no problems', () => {
      const problems = vsixProblems(FULL_LIST);

      expect(problems).toStrictEqual([]);
    });
  });

  describe('GIVEN a list without LICENSE-CODE', () => {
    it('WHEN it is checked THEN there are no problems', () => {
      const files = FULL_LIST.filter((file) => !file.endsWith('LICENSE-CODE'));

      const problems = vsixProblems(files);

      expect(problems).toStrictEqual([]);
    });
  });

  describe('GIVEN a list without codicon.ttf', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => !file.endsWith('codicon.ttf'));

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/details/codicon.ttf');
    });
  });

  describe('GIVEN a list without tool-icons.ttf', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => !file.endsWith('tool-icons.ttf'));

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/details/tool-icons.ttf');
    });
  });

  describe('GIVEN a list without tool-icons.css', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => !file.endsWith('tool-icons.css'));

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/details/tool-icons.css');
    });
  });

  describe('GIVEN a list without TOOL-ICONS-NOTICE.md', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => !file.endsWith('TOOL-ICONS-NOTICE.md'));

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/details/TOOL-ICONS-NOTICE.md');
    });
  });

  describe('GIVEN a list with an unknown dist/webview/details/x.md', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'dist/webview/details/x.md'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/details/x.md');
    });
  });

  describe('GIVEN a list with src/extension.ts', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'src/extension.ts'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('src/extension.ts');
    });
  });

  describe('GIVEN a list with dist/extension.cjs.map', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'dist/extension.cjs.map'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/extension.cjs.map');
    });
  });

  describe('GIVEN a list with dist/webview/details/main.js.map', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'dist/webview/details/main.js.map'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('main.js.map');
    });
  });

  describe('GIVEN a list without dist/extension.cjs', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => file !== 'dist/extension.cjs');

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/extension.cjs');
    });
  });

  describe('GIVEN a list with a file in another dist/webview folder', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'dist/webview/other/main.js'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/other/main.js');
    });
  });

  describe('GIVEN a list without dist/webview/graph/main.js', () => {
    it('WHEN it is checked THEN one problem names the missing file', () => {
      const files = FULL_LIST.filter((file) => file !== 'dist/webview/graph/main.js');

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('dist/webview/graph/main.js');
    });
  });

  describe('GIVEN a list with dist/webview/graph/stray.js', () => {
    it('WHEN it is checked THEN one problem says the webview file is unexpected', () => {
      const files = [...FULL_LIST, 'dist/webview/graph/stray.js'];

      const problems = vsixProblems(files);

      expect(problems).toStrictEqual(['unexpected webview file: dist/webview/graph/stray.js']);
    });
  });

  describe('GIVEN a list with a stray dist/webview/details/old.js', () => {
    it('WHEN it is checked THEN one problem names it', () => {
      const files = [...FULL_LIST, 'dist/webview/details/old.js'];

      const problems = vsixProblems(files);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('old.js');
    });
  });
});
