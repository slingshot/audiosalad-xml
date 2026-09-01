/** An XML element. A node has either element children or text, never both. */
export interface XmlElement {
    readonly name: string;
    readonly attrs: ReadonlyArray<readonly [string, string]>;
    readonly children: readonly XmlElement[];
    readonly text?: string;
}

/** Build an element with element children. */
export const el = (
    name: string,
    children: readonly XmlElement[],
    attrs: ReadonlyArray<readonly [string, string]> = [],
): XmlElement => ({ name, attrs, children });

/** Build a leaf element carrying text content. */
export const leaf = (name: string, text: string): XmlElement => ({
    name,
    attrs: [],
    children: [],
    text,
});
