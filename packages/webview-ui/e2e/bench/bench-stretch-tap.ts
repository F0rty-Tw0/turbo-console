import { recordNote } from './bench-record.ts';
import type { BenchSession } from './common/bench.type.ts';
import { MAX_TAP_ATTEMPTS, TAP_SETTLE_MS } from './common/stretch.const.ts';
import { isPollTimeout } from './utils/poll-timeout.util.ts';
import { tapNoteOf } from './utils/stretch-note.util.ts';
import { GraphAtoms } from '../pages/graph-atoms.po.ts';

/** The group's box is `isDrawn` within `TAP_SETTLE_MS`; any error other than that poll timing out is rethrown. */
const hasSettledAs = async (atoms: GraphAtoms, id: string, isDrawn: boolean): Promise<boolean> => {
  try {
    await atoms.expectBoxDrawn(id, isDrawn, TAP_SETTLE_MS);
  } catch (error) {
    const isTimeout = isPollTimeout(error);

    if (isTimeout) return false;

    throw error;
  }

  return true;
};

/** Double taps the umbrella until its box is `isDrawn`, up to `MAX_TAP_ATTEMPTS` times, noting how many it took; a tap pair Cytoscape dropped toggles nothing. */
export const tappedUntil = async (session: BenchSession, id: string, isDrawn: boolean): Promise<void> => {
  const atoms = new GraphAtoms(session.page);

  for (let attempt = 0; attempt < MAX_TAP_ATTEMPTS; attempt += 1) {
    await atoms.toggle(id);

    const isSettled = await hasSettledAs(atoms, id, isDrawn);

    if (isSettled) {
      recordNote(tapNoteOf(id, attempt + 1));

      return;
    }
  }

  throw new Error(`bench stretch: ${MAX_TAP_ATTEMPTS} double taps left the box of ${id} ${isDrawn ? 'undrawn' : 'drawn'}`);
};
