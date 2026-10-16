import type { HostMessage, RunStateMessage, RunView } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { recordPosted } from './posted-cap.ts';
import { POSTED_MAX } from '../common/details.const.ts';

const RUN_VIEW_STUB: RunView = { iconId: 'tools', colorVar: null, text: '', isRunning: false };

const messageAt = (index: number): RunStateMessage => {
  const message: RunStateMessage = { type: 'runState', taskId: `a#t${index}`, run: RUN_VIEW_STUB };

  return message;
};

describe('FEATURE: the posted messages kept per panel', () => {
  it('GIVEN fewer than the cap WHEN a message is recorded THEN all are kept in order', () => {
    const posted: HostMessage[] = [messageAt(0)];

    recordPosted(posted, messageAt(1));

    expect(posted).toStrictEqual([messageAt(0), messageAt(1)]);
  });

  it('GIVEN the cap is full WHEN one more is recorded THEN the oldest drops and the cap holds', () => {
    const posted: HostMessage[] = Array.from({ length: POSTED_MAX }, (_, index) => messageAt(index));

    recordPosted(posted, messageAt(POSTED_MAX));

    expect(posted).toHaveLength(POSTED_MAX);
    expect(posted[0]).toStrictEqual(messageAt(1));
    expect(posted.at(-1)).toStrictEqual(messageAt(POSTED_MAX));
  });
});
