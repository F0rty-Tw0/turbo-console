import { StoredToggle } from './stored-toggle.ts';
import { SCRIPTS_KEY } from '../common/scripts-toggle.const.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** Whether the Packages view lists package.json scripts (spec 1c-b): a `StoredToggle` under the scripts key. */
export class ScriptsToggle extends StoredToggle {
  public constructor(ports: ScriptsTogglePorts) {
    super(SCRIPTS_KEY, ports);
  }
}
