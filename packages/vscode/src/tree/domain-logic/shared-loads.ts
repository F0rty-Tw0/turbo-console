import { sharedAffectedOf } from './shared-affected.ts';
import { sharedAtomsOf } from './shared-atoms.ts';
import { sharedPredictionOf } from './shared-prediction.ts';
import type { Roots } from '../../roots/common/coordinator.type.ts';
import type { Output } from '../../shared/common/output.type.ts';
import type { ScriptsToggleApi } from '../../shared/common/scripts-toggle.type.ts';
import type { SharedLoads } from '../common/shared-loads.type.ts';
import { editorAffectedPorts } from '../data-access/affected-ports.ts';
import { editorAtomPorts } from '../data-access/atom-ports.ts';
import { editorPredictionPorts } from '../data-access/prediction-ports.ts';

type Followable = { readonly toggled: (shown: boolean) => void; readonly dispose: () => void };

/**
 * `shared` restored from the stored toggle and following its flips. It is subscribed before the function returns so
 * the store has followed a flip before any later subscriber hears it; the returned `dispose` also drops that subscription.
 */
const followed = <Shared extends Followable>(shared: Shared, toggle: ScriptsToggleApi): Shared => {
  const follow = (): void => {
    shared.toggled(toggle.isShown());
  };

  follow();

  const unsubscribe = toggle.onDidChange(follow);
  const dispose = (): void => {
    unsubscribe();
    shared.dispose();
  };
  const following: Shared = { ...shared, dispose };

  return following;
};

/**
 * The loads a window shares, built over `roots`: the Atomizer's, the cache prediction's and the affected tasks'. The
 * prediction and affected stores follow their stored toggles from the first line. `dispose` ends both.
 */
export const sharedLoadsOf = (roots: Roots, output: Output, prediction: ScriptsToggleApi, affected: ScriptsToggleApi): SharedLoads => {
  const atoms = sharedAtomsOf(roots, editorAtomPorts(roots, output));
  const followedPrediction = followed(sharedPredictionOf(roots, editorPredictionPorts(roots, output)), prediction);
  const followedAffected = followed(sharedAffectedOf(roots, editorAffectedPorts(roots, output)), affected);
  const dispose = (): void => {
    followedPrediction.dispose();
    followedAffected.dispose();
  };
  const loads: SharedLoads = { atoms, prediction: followedPrediction, affected: followedAffected, dispose };

  return loads;
};
