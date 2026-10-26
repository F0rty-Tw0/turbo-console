import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { traceView } from './details-trace.ts';
import type { TraceDetails } from '../common/details-view.type.ts';
import type { TraceStepModel, TraceViewModel } from '../common/details.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { namesIn } from '../test/utils/details-names.spec.util.ts';

const stepOf = (name: string): TraceStepModel => {
  const step: TraceStepModel = { name, isVisible: true, isShowable: false };

  return step;
};

const STEP_NAMES = ['@acme/web', '@acme/api', '@acme/ui'];

const STEPS: TraceStepModel[] = STEP_NAMES.map(stepOf);

/** `@acme/web` depends on `@acme/ui` through `@acme/api`. */
const FORWARD: TraceViewModel = { start: '@acme/web', end: '@acme/ui', direction: 'forward', steps: STEPS };

describe('FEATURE: traceView', () => {
  let view: TraceDetails;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    view = traceView(FORWARD, false);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a forward trace of three steps', () => {
    it('WHEN built THEN the heading is "Trace"', () => {
      expect(view.heading.textContent).toBe('Trace');
    });

    it('WHEN built THEN the lead counts the path and names no package', () => {
      expect(view.lead.textContent).toBe('3 packages on the shortest path.');
    });

    it('WHEN built THEN the heading is described by the lead', () => {
      const describedBy = view.heading.getAttribute('aria-describedby');
      const children = Array.from(view.root.children);
      const described = children.find((child) => child.id === describedBy);

      expect(described?.textContent).toBe('3 packages on the shortest path.');
    });

    it('WHEN built THEN each package name appears once, in the rail', () => {
      const names = namesIn(view.root);

      expect(names).toStrictEqual(['@acme/web', '@acme/api', '@acme/ui']);
    });
  });
});
