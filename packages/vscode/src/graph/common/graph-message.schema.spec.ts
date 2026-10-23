import { describe, expect, it } from 'vitest';

import { graphMessageSchema } from './graph-message.schema.ts';
import { EXPORT_PNG_MAX } from './graph.const.ts';

const OVERSIZE_NOT_BASE64 = `!${'A'.repeat(EXPORT_PNG_MAX)}`;

describe('FEATURE: graph message schema', () => {
  describe('GIVEN an exportImage png past the cap that is not base64 either', () => {
    it('WHEN parsed THEN the only issue is too_big, so the base64 pattern never scans it', () => {
      const parsed = graphMessageSchema.safeParse({ type: 'exportImage', png: OVERSIZE_NOT_BASE64 });

      const codes = parsed.error?.issues.map((issue) => issue.code);

      expect(codes).toStrictEqual(['too_big']);
    });
  });
});
