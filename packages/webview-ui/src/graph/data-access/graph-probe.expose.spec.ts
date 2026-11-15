import { describe, expect, it, vi } from 'vitest';

import { exposeProbe } from './graph-probe.ts';
import type { GraphProbe, ProbeHost } from '../common/graph-probe.type.ts';
import { GRAPH_PROBE_STUB } from '../test/stubs/graph-probe.stub.ts';

describe('FEATURE: exposeProbe', () => {
  describe.each([
    ['no flag', {}],
    ["the string 'true'", { tcGraphProbeWanted: 'true' }],
    ['the number 1', { tcGraphProbeWanted: 1 }],
    ['an object, as an element with the flag for its id would be', { tcGraphProbeWanted: {} }]
  ])('GIVEN %s', (_name, host: ProbeHost) => {
    it('WHEN the probe is offered THEN none is built or exposed', () => {
      const probeOf = vi.fn<() => GraphProbe>(() => GRAPH_PROBE_STUB);

      exposeProbe(host, probeOf);

      expect(probeOf).not.toHaveBeenCalled();
      expect(host.tcGraphProbe).toBeUndefined();
    });
  });

  describe('GIVEN the flag true', () => {
    it('WHEN the probe is offered THEN the host holds the probe built once', () => {
      const host: ProbeHost = { tcGraphProbeWanted: true };
      const probeOf = vi.fn<() => GraphProbe>(() => GRAPH_PROBE_STUB);

      exposeProbe(host, probeOf);

      const exposed: GraphProbe | undefined = host.tcGraphProbe;

      expect(probeOf).toHaveBeenCalledOnce();
      expect(exposed).toBe(GRAPH_PROBE_STUB);
    });
  });
});
