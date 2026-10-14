import { describe, expect, it } from 'vitest';

import { rootFoldersOf } from './root-folders.util.ts';
import type { EditorFolder } from '../common/root.type.ts';

const LOCAL_URI: EditorFolder['uri'] = { scheme: 'file', fsPath: '/ws' };

const VIRTUAL_URI: EditorFolder['uri'] = { scheme: 'vscode-vfs', fsPath: '/github/org/repo' };

const LOCAL: EditorFolder = { name: 'ws', uri: LOCAL_URI };

const VIRTUAL: EditorFolder = { name: 'remote', uri: VIRTUAL_URI };

describe('FEATURE: root folders of the workspace', () => {
  describe('GIVEN the workspace folders', () => {
    it('WHEN a folder is on disk THEN it is a candidate under its fsPath and name', () => {
      const folders = rootFoldersOf([LOCAL]);

      expect(folders).toStrictEqual([{ root: '/ws', name: 'ws' }]);
    });

    it('WHEN a folder is virtual THEN it is left out', () => {
      const folders = rootFoldersOf([VIRTUAL, LOCAL]);

      expect(folders).toStrictEqual([{ root: '/ws', name: 'ws' }]);
    });

    it('WHEN there are none THEN there is no candidate', () => {
      const folders = rootFoldersOf([]);

      expect(folders).toStrictEqual([]);
    });
  });
});
