import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closestButtonOf } from './closest-button.util.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { stubElementClass } from '../test/utils/graph-package-side.spec.util.ts';

/** A click event aimed at `target`, as a delegated listener receives it. */
const clickOn = (target: EventTarget | null): Event => {
  const event = new Event('click');

  Object.defineProperty(event, 'target', { value: target });

  return event;
};

describe('FEATURE: closestButtonOf', () => {
  let button: HTMLElement;
  let number: HTMLElement;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    stubElementClass();
    button = document.createElement('button');
    number = document.createElement('span');
    button.append(number);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN a span inside a button', () => {
    it('WHEN a click lands on the span THEN the button is answered', () => {
      const event = clickOn(number);

      const found = closestButtonOf(event, 'button');

      expect(found).toBe(button);
    });

    it('WHEN a click lands on the button THEN the button is answered', () => {
      const event = clickOn(button);

      const found = closestButtonOf(event, 'button');

      expect(found).toBe(button);
    });
  });

  describe('GIVEN a span inside a button inside a section', () => {
    it('WHEN asked for a section THEN the section is answered, not the button', () => {
      const section = document.createElement('section');
      const event = clickOn(number);

      section.append(button);

      const found = closestButtonOf(event, 'section');

      expect(found).toBe(section);
    });
  });

  describe('GIVEN a span outside any button', () => {
    it('WHEN a click lands on the span THEN null is answered', () => {
      const lone = document.createElement('span');
      const event = clickOn(lone);

      const found = closestButtonOf(event, 'button');

      expect(found).toBeNull();
    });
  });

  describe('GIVEN a click whose target is not an element', () => {
    it('WHEN asked THEN null is answered', () => {
      const event = clickOn(null);

      const found = closestButtonOf(event, 'button');

      expect(found).toBeNull();
    });
  });
});
