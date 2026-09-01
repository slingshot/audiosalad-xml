import type { XmlElement } from './node';

export interface SerializeOptions {
    /** Indent string, or false for a single line. Default four spaces. */
    indent?: string | false;
    /** Emit `<?xml version="1.0" encoding="UTF-8"?>`. Default true. */
    xmlDeclaration?: boolean;
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * Characters XML 1.0 permits are #x9 | #xA | #xD | [#x20-#xD7FF] |
 * [#xE000-#xFFFD] | [#x10000-#x10FFFF]. Anything else — C0 controls, lone
 * surrogates — cannot be represented even as a character reference. The `u`
 * flag makes this iterate by code point, so astral characters pass.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the point of this pattern is to detect XML-illegal control characters
const ILLEGAL_XML_CHAR = /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u;

/** Returns the first XML-illegal character in `s`, or undefined if there is none. */
export const findIllegalChar = (s: string): string | undefined => ILLEGAL_XML_CHAR.exec(s)?.[0];

/** Escapes the five predefined entities. Assumes `s` holds no illegal characters. */
export const escapeText = (s: string): string =>
    s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');

const writeElement = (
    node: XmlElement,
    indent: string | false,
    depth: number,
    out: string[],
): void => {
    const pad = indent === false ? '' : indent.repeat(depth);
    const attrs = node.attrs.map(([k, v]) => ` ${k}="${escapeText(v)}"`).join('');

    if (node.text !== undefined) {
        out.push(`${pad}<${node.name}${attrs}>${escapeText(node.text)}</${node.name}>`);
        return;
    }
    if (node.children.length === 0) {
        out.push(`${pad}<${node.name}${attrs}/>`);
        return;
    }
    out.push(`${pad}<${node.name}${attrs}>`);
    for (const child of node.children) {
        writeElement(child, indent, depth + 1, out);
    }
    out.push(`${pad}</${node.name}>`);
};

/**
 * Serializes a finished tree in one pass. The 0.1.x pipeline called a
 * formatter at every nesting level, re-parsing the whole subtree each time.
 */
export const serialize = (root: XmlElement, opts: SerializeOptions = {}): string => {
    const indent = opts.indent ?? '    ';
    const out: string[] = [];
    writeElement(root, indent, 0, out);
    const body = indent === false ? out.join('') : out.join('\n');
    return opts.xmlDeclaration === false ? body : `${XML_DECLARATION}\n${body}`;
};
