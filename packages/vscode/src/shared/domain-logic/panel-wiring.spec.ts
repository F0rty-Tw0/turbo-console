import { describe, expect, it, vi } from 'vitest';

import { recordingPost, wirePanel } from './panel-wiring.ts';
import { POSTED_MAX } from '../common/panel.const.ts';
import { viewMock } from '../test/mocks/panel-view.mock.ts';
import { wiredSessionMock } from '../test/mocks/wired-session.mock.ts';

const READY = { type: 'ready' };

const throwingStart = (): void => {
  throw new Error('no store');
};

const throwingOnDispose = (): void => {
  throw new Error('view gone');
};

const throwingSend = (): never => {
  throw new Error('webview is disposed');
};

describe('FEATURE: panel wiring', () => {
  describe('GIVEN a shown view', () => {
    it('WHEN it is wired THEN the session is shown once and started', () => {
      const fake = viewMock();
      const session = wiredSessionMock();

      wirePanel(fake.view, session, vi.fn(), vi.fn());

      expect(session.setVisible).toHaveBeenCalledExactlyOnceWith(true);
      expect(session.start).toHaveBeenCalledOnce();
    });

    it('WHEN the view hides THEN the session hears it hidden', () => {
      const fake = viewMock();
      const session = wiredSessionMock();

      wirePanel(fake.view, session, vi.fn(), vi.fn());
      fake.show(false);

      expect(session.setVisible).toHaveBeenLastCalledWith(false);
    });

    it('WHEN the page sends a message THEN the session receives it', () => {
      const fake = viewMock();
      const session = wiredSessionMock();

      wirePanel(fake.view, session, vi.fn(), vi.fn());
      fake.message(READY);

      expect(session.receive).toHaveBeenCalledExactlyOnceWith(READY);
    });

    it('WHEN the session rejects a message THEN the failure is logged', async () => {
      const fake = viewMock();
      const session = wiredSessionMock();
      const log = vi.fn();

      vi.mocked(session.receive).mockRejectedValue(new Error('bad message'));
      wirePanel(fake.view, session, vi.fn(), log);
      fake.message(READY);
      await vi.waitFor(() => {
        expect(log).toHaveBeenCalled();
      });

      expect(log).toHaveBeenCalledExactlyOnceWith('bad message');
    });

    it('WHEN the view is disposed THEN onClose runs once', () => {
      const fake = viewMock();
      const onClose = vi.fn();

      wirePanel(fake.view, wiredSessionMock(), onClose, vi.fn());
      fake.close();

      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN a hidden view', () => {
    it('WHEN it is wired THEN the session is told hidden', () => {
      const session = wiredSessionMock();

      wirePanel(viewMock(false).view, session, vi.fn(), vi.fn());

      expect(session.setVisible).toHaveBeenCalledExactlyOnceWith(false);
    });
  });

  describe('GIVEN a session whose start throws', () => {
    it('WHEN it is wired THEN the failure is logged and nothing throws', () => {
      const session = wiredSessionMock();
      const log = vi.fn();

      vi.mocked(session.start).mockImplementation(throwingStart);

      wirePanel(viewMock().view, session, vi.fn(), log);

      expect(log).toHaveBeenCalledExactlyOnceWith('no store');
    });
  });

  describe('GIVEN a view whose listener registration throws', () => {
    it('WHEN it is wired THEN the error propagates to the caller', () => {
      const fake = viewMock(true, { onDispose: throwingOnDispose });

      const wire = (): void => {
        wirePanel(fake.view, wiredSessionMock(), vi.fn(), vi.fn());
      };

      expect(wire).toThrow('view gone');
    });
  });
});

describe('FEATURE: a recording post', () => {
  describe('GIVEN a send that resolves', () => {
    it('WHEN a message is posted THEN it is recorded and sent', () => {
      const send = vi.fn(async () => Promise.resolve(true));
      const posted: string[] = [];

      recordingPost(send, posted, vi.fn())('m1');

      expect(posted).toStrictEqual(['m1']);
      expect(send).toHaveBeenCalledExactlyOnceWith('m1');
    });

    it('WHEN more than the cap are posted THEN only the last POSTED_MAX are kept', () => {
      const posted: number[] = [];
      const post = recordingPost(
        vi.fn(async () => Promise.resolve(true)),
        posted,
        vi.fn()
      );

      for (let index = 0; index <= POSTED_MAX; index += 1) post(index);

      expect(posted).toHaveLength(POSTED_MAX);
      expect(posted[0]).toBe(1);
    });
  });

  describe('GIVEN a send that throws', () => {
    it('WHEN a message is posted THEN it is still recorded and the failure is logged', () => {
      const posted: string[] = [];
      const log = vi.fn();

      recordingPost(throwingSend, posted, log)('m1');

      expect(posted).toStrictEqual(['m1']);
      expect(log).toHaveBeenCalledExactlyOnceWith('webview is disposed');
    });
  });
});
