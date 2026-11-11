import { StoredToggle } from './stored-toggle.ts';
import { AFFECTED_KEY } from '../common/scripts-toggle.const.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** Whether the tree and the graph mark affected tasks (default off): a `StoredToggle` under the affected key. */
export class AffectedToggle extends StoredToggle {
  public constructor(ports: ScriptsTogglePorts) {
    super(AFFECTED_KEY, ports);
  }
}
