import { TASK_COUNT_MAX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphMessageSchema } from './graph-message.schema.ts';
import { EXPORT_PNG_MAX, TASK_ID_MAX } from './graph.const.ts';

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
});
