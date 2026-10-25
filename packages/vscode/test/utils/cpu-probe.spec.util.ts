const PROBE_ROWS = 20_000;

const PROBE_SAMPLES = 7;

type ProbeRow = {
  readonly id: number;
  readonly name: string;
  readonly dependencies: string[];
};

const probeRowOf = (index: number): ProbeRow => {
  const name = `@fx/pkg-${index}`;
  const dependencies = [`${name}-a`, `${name}-b`, `${name}-c`];
  const row: ProbeRow = { id: index, name, dependencies };

  return row;
};

const PROBE_DATA: ProbeRow[] = Array.from({ length: PROBE_ROWS }, (_, index) => probeRowOf(index));

/** One fixed piece of main-thread work, a JSON round trip, timed. */
const sampleMs = (): number => {
  const start = performance.now();
  const text = JSON.stringify(PROBE_DATA);

  JSON.parse(text);

  return performance.now() - start;
};

/**
 * `PROBE_SAMPLES` timings of the same fixed main-thread work, so a caller can tell how fast this thread runs right now.
 * One untimed run goes first: the first JSON round trip pays the JIT warm-up and runs ~1.6× the rest.
 */
export const cpuProbeSamples = (): number[] => {
  sampleMs();

  return Array.from({ length: PROBE_SAMPLES }, sampleMs);
};
