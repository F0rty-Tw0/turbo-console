import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { OpenPanel } from '../common/panel.type.ts';

/** Asks each panel to post a fresh state; a panel that throws is logged and the next one still posts. `log` must not throw. */
export const publishEach = (panels: Iterable<OpenPanel>, log: (text: string) => void): void => {
  for (const panel of panels) {
    try {
      panel.session.publish();
    } catch (error: unknown) {
      log(logTextOf(error));
    }
  }
};
