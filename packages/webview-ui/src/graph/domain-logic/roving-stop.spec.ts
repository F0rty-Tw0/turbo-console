import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { followFocus, moveStopOnKey, writeStops } from './roving-stop.ts';
import type { RovingButtons, RovingEntry } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { pressKey } from '../test/utils/key-events.spec.util.ts';

type Kind = 'first' | 'second' | 'third' | 'missing';

type Buttons = {
  readonly first: HTMLButtonElement;
  readonly second: HTMLButtonElement;
  readonly third: HTMLButtonElement;
};

type StopRig = {
  readonly entry: RovingEntry<Kind>;
  readonly buttons: Buttons;
  /** Holds the buttons and the keydown and focusin listeners that move the stop. */
  readonly root: HTMLElement;
};

const ORDER: Kind[] = ['first', 'second', 'third', 'missing'];

/** Three shown buttons in a root and a kind without one, the Tab stop on the first. */
const rigOf = (): StopRig => {
  const buttons: Buttons = {
    first: document.createElement('button'),
    second: document.createElement('button'),
    third: document.createElement('button')
  };
  const elements: RovingButtons<Kind> = { ...buttons, missing: null };
  const entry: RovingEntry<Kind> = { elements, shown: ['first', 'second', 'third'], preferred: 'first' };
  const root = document.createElement('div');

  root.append(buttons.first, buttons.second, buttons.third);
  root.addEventListener('keydown', (event: KeyboardEvent): void => moveStopOnKey(entry, ORDER, event));
  root.addEventListener('focusin', (event: FocusEvent): void => followFocus(entry, ORDER, event));
  writeStops(ORDER, elements, 'first');
  const rig: StopRig = { entry, buttons, root };

  return rig;
};

const stopsOf = ({ first, second, third }: Buttons): number[] => [first.tabIndex, second.tabIndex, third.tabIndex];

describe('FEATURE: roving stop', () => {
  let rig: StopRig;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('GIVEN the stop on the first button WHEN the stops are written for the third THEN only the third is the stop', () => {
    writeStops(ORDER, rig.entry.elements, 'third');

    expect(stopsOf(rig.buttons)).toStrictEqual([-1, -1, 0]);
  });

  it('GIVEN the first button focused WHEN Right is pressed THEN the second has focus, is preferred and is the one stop', () => {
    const isPrevented = pressKey(rig.root, 'ArrowRight', rig.buttons.first);

    expect(isPrevented).toBe(true);
    expect(document.activeElement).toBe(rig.buttons.second);
    expect(rig.entry.preferred).toBe('second');
    expect(stopsOf(rig.buttons)).toStrictEqual([-1, 0, -1]);
  });

  it('GIVEN the third button focused WHEN Right is pressed THEN focus wraps to the first', () => {
    pressKey(rig.root, 'ArrowRight', rig.buttons.third);

    expect(document.activeElement).toBe(rig.buttons.first);
  });

  it('GIVEN the stop on the first button WHEN the third gains focus THEN it is preferred and the one stop', () => {
    rig.buttons.third.focus();

    expect(rig.entry.preferred).toBe('third');
    expect(stopsOf(rig.buttons)).toStrictEqual([-1, -1, 0]);
  });

  it('GIVEN the first button focused WHEN a is pressed THEN the stop stays and the key is not prevented', () => {
    const isPrevented = pressKey(rig.root, 'a', rig.buttons.first);

    expect(isPrevented).toBe(false);
    expect(stopsOf(rig.buttons)).toStrictEqual([0, -1, -1]);
  });
});
