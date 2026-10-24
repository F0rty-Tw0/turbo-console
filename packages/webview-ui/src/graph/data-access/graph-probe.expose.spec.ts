/* eslint-disable @typescript-eslint/naming-convention, no-underscore-dangle -- the probe's window names are the e2e contract */

import { describe, expect, it, vi } from 'vitest';

import { exposeProbe } from './graph-probe.ts';
import type { GraphProbe, ProbeHost } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';

describe('FEATURE: exposeProbe', () => {
  it.each([
    ['no flag', {}],
    ["the string 'true'", { __tcGraphProbeWanted: 'true' }],
    ['the number 1', { __tcGraphProbeWanted: 1 }]
  ])('GIVEN %s WHEN the probe is offered THEN none is built or exposed', (_name, host: ProbeHost) => {
    const probeOf = vi.fn<() => GraphProbe>(() => GRAPH_PROBE_STUB);

    exposeProbe(host, probeOf);

    expect(probeOf).not.toHaveBeenCalled();
    expect(host.__tcGraphProbe).toBeUndefined();
  });

  it('GIVEN the flag true WHEN the probe is offered THEN the host holds the probe built once', () => {
    const host: ProbeHost = { __tcGraphProbeWanted: true };
    const probeOf = vi.fn<() => GraphProbe>(() => GRAPH_PROBE_STUB);

    exposeProbe(host, probeOf);

    const exposed: GraphProbe | undefined = host.__tcGraphProbe;

    expect(probeOf).toHaveBeenCalledOnce();
    expect(exposed).toBe(GRAPH_PROBE_STUB);
  });
});
