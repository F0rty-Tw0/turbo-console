import { sharedAtomsOf } from './shared-atoms.ts';
import { sharedPredictionOf } from './shared-prediction.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { SharedLoads } from '../common/shared-loads.type.ts';
import { editorAtomPorts } from '../data-access/atom-ports.ts';
import { editorPredictionPorts } from '../data-access/prediction-ports.ts';

/**
 * The loads a window shares, built over `roots`: the Atomizer's and the cache prediction's. The prediction follows the
 * stored toggle from the first line, and it is subscribed before the function returns so the store has followed a flip
 * before any later subscriber hears it. `prediction.dispose` also drops that subscription.
 */
export const sharedLoadsOf = (roots: Roots, output: Output, toggle: ScriptsToggleApi): SharedLoads => {
  const atoms = sharedAtomsOf(roots, editorAtomPorts(roots, output));
  const shared = sharedPredictionOf(roots, editorPredictionPorts(roots, output));
  const follow = (): void => {
    shared.toggled(toggle.isShown());
  };

  follow();

  const unsubscribe = toggle.onDidChange(follow);
  const dispose = (): void => {
    unsubscribe();
    shared.dispose();
  };
  const prediction = { ...shared, dispose };
  const loads: SharedLoads = { atoms, prediction };

  return loads;
};
