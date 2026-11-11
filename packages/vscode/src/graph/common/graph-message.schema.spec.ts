import { MANIFEST_FILE_MAX, MANIFEST_LINE_MAX, TASK_COUNT_MAX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphMessageSchema } from './graph-message.schema.ts';
import { EXPORT_PNG_MAX, PACKAGE_NAME_MAX, TASK_ID_MAX } from './graph.const.ts';

const OPEN_IMPORT_BASE = { type: 'openImport', packageName: 'web', file: 'src/x.ts', line: 1 };

const OVERSIZE_NOT_BASE64 = `!${'A'.repeat(EXPORT_PNG_MAX)}`;

describe('FEATURE: graph message schema', () => {
  describe('GIVEN an exportImage png past the cap that is not base64 either', () => {
    it('WHEN parsed THEN the only issue is too_big, so the base64 pattern never scans it', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'exportImage', png: OVERSIZE_NOT_BASE64 });

      const codes = parsed.error?.issues.map((issue) => issue.code);

      expect(codes).toStrictEqual(['too_big']);
    });
  });

  describe('GIVEN a shownUmbrellas message', () => {
    it('WHEN ids holds ids THEN it parses to those ids', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'shownUmbrellas', ids: ['a#x', 'b#y'] });

      expect(parsed.data).toStrictEqual({ type: 'shownUmbrellas', ids: ['a#x', 'b#y'] });
    });

    it.each([
      ['a non-string id', [1]],
      ['an id past TASK_ID_MAX', ['a'.repeat(TASK_ID_MAX + 1)]],
      ['more ids than TASK_COUNT_MAX', Array.from({ length: TASK_COUNT_MAX + 1 }, () => 'a#x')],
      ['ids that are not an array', 'a#x']
    ])('WHEN ids holds %s THEN parse fails', (_label, ids) => {
      const parsed = graphMessageSchema.safeParse({ type: 'shownUmbrellas', ids });

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN a shownTaskPackages message', () => {
    it('WHEN packageNames holds names THEN it parses to those names and the unknown key is stripped', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'shownTaskPackages', packageNames: ['app', 'lib'], extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'shownTaskPackages', packageNames: ['app', 'lib'] });
    });

    it.each([
      ['a non-array', 'app'],
      ['a non-string name', [1]],
      ['a name over PACKAGE_NAME_MAX', ['x'.repeat(PACKAGE_NAME_MAX + 1)]],
      ['more than TASK_COUNT_MAX names', Array.from({ length: TASK_COUNT_MAX + 1 }, () => 'a')]
    ])('WHEN packageNames holds %s THEN parse fails', (_label, packageNames) => {
      const parsed = graphMessageSchema.safeParse({ type: 'shownTaskPackages', packageNames });

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN a setViewToggle with a known toggle and a boolean', () => {
    it('WHEN parsed THEN it parses to those fields and the unknown key is stripped', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'setViewToggle', toggle: 'scope', shown: true, extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'setViewToggle', toggle: 'scope', shown: true });
    });
  });

  describe('GIVEN a setViewToggle for prediction', () => {
    it('WHEN parsed THEN it parses and keeps its three fields', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'setViewToggle', toggle: 'prediction', shown: true, extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'setViewToggle', toggle: 'prediction', shown: true });
    });
  });

  describe('GIVEN a setViewToggle for affected', () => {
    it('WHEN parsed THEN it parses and keeps its three fields', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'setViewToggle', toggle: 'affected', shown: true, extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'setViewToggle', toggle: 'affected', shown: true });
    });
  });

  describe('GIVEN a setViewToggle with a bad field', () => {
    it.each([
      ['an unknown toggle', { toggle: 'theme', shown: true }],
      ['a string shown', { toggle: 'scope', shown: 'yes' }],
      ['no shown', { toggle: 'scripts' }],
      ['no toggle', { shown: false }]
    ])('WHEN it has %s THEN parse fails', (_label, fields) => {
      const parsed = graphMessageSchema.safeParse({ type: 'setViewToggle', ...fields });

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN a scanImports message', () => {
    it('WHEN it names a source and a target THEN it parses to them and an unknown key is stripped', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'scanImports', source: 'web', target: 'a', extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'scanImports', source: 'web', target: 'a' });
    });

    it.each([
      ['no target', { source: 'web' }],
      ['a numeric target', { source: 'web', target: 1 }],
      ['a source past PACKAGE_NAME_MAX', { source: 'a'.repeat(PACKAGE_NAME_MAX + 1), target: 'a' }]
    ])('WHEN it has %s THEN parse fails', (_label, fields) => {
      const parsed = graphMessageSchema.safeParse({ type: 'scanImports', ...fields });

      expect(parsed.success).toBe(false);
    });
  });

  describe('GIVEN an openImport message', () => {
    it.each([
      ['line 0', 0],
      ['line MANIFEST_LINE_MAX', MANIFEST_LINE_MAX]
    ])('WHEN it has %s THEN it parses unchanged', (_label, line) => {
      const parsed = graphMessageSchema.safeParse({ ...OPEN_IMPORT_BASE, line });

      expect(parsed.data).toStrictEqual({ ...OPEN_IMPORT_BASE, line });
    });

    it('WHEN file is exactly MANIFEST_FILE_MAX chars THEN it parses', () => {
      const parsed = graphMessageSchema.safeParse({ ...OPEN_IMPORT_BASE, file: 'a'.repeat(MANIFEST_FILE_MAX) });

      expect(parsed.success).toBe(true);
    });

    it.each([
      ['line -1', { line: -1 }],
      ['line MANIFEST_LINE_MAX + 1', { line: MANIFEST_LINE_MAX + 1 }],
      ['a fractional line', { line: 1.5 }],
      ['no line', { line: undefined }],
      ['a file of MANIFEST_FILE_MAX + 1 chars', { file: 'a'.repeat(MANIFEST_FILE_MAX + 1) }],
      ['no file', { file: undefined }],
      ['a numeric file', { file: 1 }],
      ['a packageName past PACKAGE_NAME_MAX', { packageName: 'a'.repeat(PACKAGE_NAME_MAX + 1) }]
    ])('WHEN it has %s THEN parse fails', (_label, patch) => {
      const parsed = graphMessageSchema.safeParse({ ...OPEN_IMPORT_BASE, ...patch });

      expect(parsed.success).toBe(false);
    });
  });
});
