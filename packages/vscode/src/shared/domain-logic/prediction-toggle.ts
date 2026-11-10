import { StoredToggle } from './stored-toggle.ts';
import { PREDICTION_KEY } from '../common/scripts-toggle.const.ts';
import type { ScriptsTogglePorts } from '../common/scripts-toggle.type.ts';

/** Whether the tree and the graph show cache predictions (default off): a `StoredToggle` under the prediction key. */
export class PredictionToggle extends StoredToggle {
  public constructor(ports: ScriptsTogglePorts) {
    super(PREDICTION_KEY, ports);
  }
}
