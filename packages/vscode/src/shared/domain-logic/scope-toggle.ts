import { StoredToggle } from './stored-toggle.ts';
import { SCOPE_KEY } from '../common/scope-toggle.const.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** Whether the Packages view lists packages under their scope: a `StoredToggle` under the scope key. */
export class ScopeToggle extends StoredToggle {
  public constructor(ports: ScriptsTogglePorts) {
    super(SCOPE_KEY, ports);
  }
}
