import { fakeClassListMock } from './fake-class-list.mock.ts';
import { fakeStyleMock } from './fake-style.mock.ts';
import type { AddedListener, FakeClassList, FakeEvent, FakeListener, FakeRect } from '../common/fake-document.type.ts';
import { FakeNode } from '../utils/fake-node.spec.util.ts';

type FakeFocus = {
  element: FakeElement | null;
};

const ignore = (): void => undefined;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/** What an element's `ownerDocument` answers: the element focused last. */
type FakeOwner = {
  readonly activeElement: FakeElement | null;
};

/**
 * The few DOM calls the graph's element builders make, for specs that run without a DOM: the tree and attributes of
 * `FakeNode`, classes, plain properties, listeners by event type, focus and the popover open state. An input's `value` follows `defaultValue` until it is set.
 */
class FakeElement extends FakeNode {
  public readonly tagName: string;
  public className = '';
  public textContent = '';
  public id = '';
  public type = '';
  public title = '';
  public hidden = false;
  public disabled = false;
  public tabIndex = 0;
  public min = '';
  public max = '';
  public step = '';
  public defaultValue = '';
  public autocomplete = '';
  public spellcheck = true;
  public offsetLeft = 0;
  public offsetTop = 0;
  public offsetWidth = 0;
  public offsetHeight = 0;
  public readonly style: Record<string, string> = fakeStyleMock();
  public readonly dataset: Record<string, string> = {};
  public readonly scrollIntoView = ignore;
  public readonly classList: FakeClassList = fakeClassListMock(this);

  private readonly listeners: AddedListener[] = [];
  private readonly focused: FakeFocus;
  private typed: string | null = null;
  private isPopoverOpen = false;

  public constructor(tag: string, focus: FakeFocus) {
    super();
    this.tagName = tag.toUpperCase();
    this.focused = focus;
  }

  public get value(): string {
    return this.typed ?? this.defaultValue;
  }

  public set value(text: string) {
    this.typed = text;
  }

  public get ownerDocument(): FakeOwner {
    const owner: FakeOwner = { activeElement: this.focused.element };

    return owner;
  }

  public addEventListener(type: string, listener: FakeListener): void {
    this.listeners.push({ type, listener });
  }

  /** Runs the listeners added for `event.type`, in the order added. */
  public dispatchEvent(event: FakeEvent): boolean {
    const matching = this.listeners.filter((each) => each.type === event.type);

    for (const { listener } of matching) listener(event);

    return true;
  }

  public click(): void {
    this.dispatchEvent({ type: 'click' });
  }

  public getBoundingClientRect(): FakeRect {
    const rect: FakeRect = { left: this.offsetLeft, top: this.offsetTop, width: this.offsetWidth, height: this.offsetHeight };

    return rect;
  }

  public focus(): void {
    this.focused.element = this;
  }

  public showPopover(): void {
    this.isPopoverOpen = true;
  }

  public hidePopover(): void {
    this.isPopoverOpen = false;
  }

  /** Answers only `:popover-open`, from `showPopover` and `hidePopover`; any other selector is false. */
  public matches(selector: string): boolean {
    return selector === ':popover-open' && this.isPopoverOpen;
  }
}

type FakeDocument = {
  readonly createElement: (tag: string) => FakeElement;
  /** An SVG element: a fake element like any other; any other namespace throws. */
  readonly createElementNS: (namespace: string, tag: string) => FakeElement;
  readonly activeElement: FakeElement | null;
  /** The element a `focus()` on the body moves focus to; it holds no children. */
  readonly body: FakeElement;
  /** Document listeners never run: no spec dispatches on the document. */
  readonly addEventListener: () => void;
};

/** A `document` for `vi.stubGlobal('document', …)`: `createElement`, `createElementNS`, a `body` and the element `focus()` last moved to. */
export const fakeDocumentMock = (): FakeDocument => {
  const focus: FakeFocus = { element: null };
  const body = new FakeElement('body', focus);
  const fake: FakeDocument = {
    createElement: (tag: string): FakeElement => new FakeElement(tag, focus),
    createElementNS: (namespace: string, tag: string): FakeElement => {
      if (namespace !== SVG_NAMESPACE) throw new Error(`fake document: no ${namespace} elements`);

      return new FakeElement(tag, focus);
    },
    body,
    addEventListener: (): void => undefined,
    get activeElement(): FakeElement | null {
      return focus.element;
    }
  };

  return fake;
};
