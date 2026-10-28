/** The tree half of a fake DOM element: children, the parent link, attributes and an attribute `querySelector`. */
export class FakeNode {
  public readonly children: FakeNode[] = [];
  public parent: FakeNode | null = null;

  private readonly attributes = new Map<string, string>();

  public get isConnected(): boolean {
    return this.parent !== null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public append(...nodes: FakeNode[]): void {
    for (const node of nodes) node.parent = this;

    this.children.push(...nodes);
  }

  public prepend(...nodes: FakeNode[]): void {
    for (const node of nodes) node.parent = this;

    this.children.unshift(...nodes);
  }

  /** Inserts `node` before `before`, or at the end when `before` is `null`. */
  public insertBefore(node: FakeNode, before: FakeNode | null): void {
    const at = before === null ? this.children.length : this.children.indexOf(before);

    node.parent = this;
    this.children.splice(at, 0, node);
  }

  public replaceChildren(...nodes: FakeNode[]): void {
    for (const child of this.children) child.parent = null;

    this.children.length = 0;
    this.append(...nodes);
  }

  public contains(node: FakeNode | null): boolean {
    if (node === null) return false;

    if (node === this) return true;

    return this.contains(node.parent);
  }

  public remove(): void {
    const { parent } = this;

    if (parent === null) return;

    const kept = parent.children.filter((child) => child !== this);

    parent.replaceChildren(...kept);
  }

  public replaceWith(node: FakeNode): void {
    const { parent } = this;

    if (parent === null) return;

    const swapped = parent.children.map((child) => (child === this ? node : child));

    parent.replaceChildren(...swapped);
  }

  /** Answers only `[name="value"]`: the first descendant, depth first, whose attribute `name` reads `value`; any other selector is null. */
  public querySelector(selector: string): FakeNode | null {
    for (const child of this.children) {
      const isMatch = child.hasAttributeOf(selector);

      if (isMatch) return child;

      const found = child.querySelector(selector);

      if (found !== null) return found;
    }

    return null;
  }

  private hasAttributeOf(selector: string): boolean {
    const entries = [...this.attributes];

    return entries.some(([name, value]) => selector === `[${name}="${value}"]`);
  }
}
