import type { WebviewMessage } from '@turbo-console/webview-ui';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { output } from 'zod/mini';

import { webviewMessageSchema } from './details-message.schema.ts';

const EVERY_VARIANT: WebviewMessage[] = [
  { type: 'ready' },
  { type: 'run', taskId: 'a#build' },
  { type: 'openPackageJson' },
  { type: 'focusInGraph' },
  { type: 'refresh', scope: 'dryRun' },
  { type: 'showOutput' }
];

describe('FEATURE: webview message schema', () => {
  describe('GIVEN the webview-ui message contract', () => {
    /** `Readonly` only because webview-ui marks its message fields readonly; zod infers mutable ones. */
    it('WHEN the schema type is inferred THEN it equals WebviewMessage and parses every variant unchanged', () => {
      expectTypeOf<Readonly<output<typeof webviewMessageSchema>>>().toEqualTypeOf<WebviewMessage>();

      const parsed = EVERY_VARIANT.map((message) => webviewMessageSchema.parse(message));

      expect(parsed).toStrictEqual(EVERY_VARIANT);
    });

    it('WHEN focusInGraph carries an extra field THEN it parses with only its type', () => {
      const parsed = webviewMessageSchema.safeParse({ type: 'focusInGraph', extra: 1 });

      expect(parsed.data).toStrictEqual({ type: 'focusInGraph' });
    });
  });
});
