/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle -- the probe's window names are the e2e contract */

import { describe, expect, it } from 'vitest';

import { exposeProbe } from './graph-probe.ts';
import type { GraphProbe, ProbeHost } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';

describe('FEATURE: exposeProbe', () => {
  it.each([
    ['no flag', {}],
    ["the string 'true'", { __tcGraphProbeWanted: 'true' }],
    ['the number 1', { __tcGraphProbeWanted: 1 }]
  ])('GIVEN %s WHEN the probe is offered THEN none is exposed', (_name, host: ProbeHost) => {
    exposeProbe(host, GRAPH_PROBE_STUB);

    expect(host.__tcGraphProbe).toBeUndefined();
  });

  it('GIVEN the flag true WHEN the probe is offered THEN the host holds that probe', () => {
    const host: ProbeHost = { __tcGraphProbeWanted: true };

    exposeProbe(host, GRAPH_PROBE_STUB);

    const exposed: GraphProbe | undefined = host.__tcGraphProbe;

    expect(exposed).toBe(GRAPH_PROBE_STUB);
  });
});
