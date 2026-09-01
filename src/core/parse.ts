import type { XmlElement } from './node';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

const decodeEntities = (s: string): string =>
    s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
        if (body.startsWith('#')) {
            const cp = body.startsWith('#x')
                ? Number.parseInt(body.slice(2), 16)
                : Number.parseInt(body.slice(1), 10);
            if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) {
                throw new SyntaxError(`character reference &${body}; is out of range`);
            }
            return String.fromCodePoint(cp);
        }
        return ENTITIES[body] ?? whole;
    });

const stripPrefix = (name: string): string => {
    const i = name.indexOf(':');
    return i === -1 ? name : name.slice(i + 1);
};

interface Frame {
    name: string;
    attrs: Array<readonly [string, string]>;
    children: XmlElement[];
    text: string;
}

/** Finds the '>' closing a tag, skipping any inside quoted attribute values. */
const findTagEnd = (source: string, from: number): number => {
    let quote: string | undefined;
    for (let j = from; j < source.length; j += 1) {
        const ch = source[j];
        if (quote !== undefined) {
            if (ch === quote) quote = undefined;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (ch === '>') return j;
    }
    return -1;
};

export const parseXml = (source: string): XmlElement => {
    const stack: Frame[] = [];
    let root: XmlElement | undefined;
    let i = 0;
    const fail = (msg: string): never => {
        throw new SyntaxError(`${msg} at offset ${i}`);
    };
    const finish = (frame: Frame): XmlElement => {
        const text = frame.children.length > 0 ? undefined : decodeEntities(frame.text);
        const node: XmlElement =
            text === undefined
                ? { name: frame.name, attrs: frame.attrs, children: frame.children }
                : { name: frame.name, attrs: frame.attrs, children: [], text };
        const parent = stack[stack.length - 1];
        if (parent) parent.children.push(node);
        else if (root) fail('multiple root elements');
        else root = node;
        return node;
    };

    while (i < source.length) {
        const lt = source.indexOf('<', i);
        if (lt === -1) {
            const tail = source.slice(i);
            if (stack.length > 0) stack[stack.length - 1]!.text += tail;
            else if (tail.trim() !== '') fail('text outside the root element');
            break;
        }
        if (lt > i) {
            const chunk = source.slice(i, lt);
            const top = stack[stack.length - 1];
            if (top) top.text += chunk;
            else if (chunk.trim() !== '') fail('text outside the root element');
        }
        i = lt;
        if (source.startsWith('<!--', i)) {
            const end = source.indexOf('-->', i);
            if (end === -1) fail('unterminated comment');
            i = end + 3;
            continue;
        }
        if (source.startsWith('<![CDATA[', i)) {
            const end = source.indexOf(']]>', i);
            if (end === -1) fail('unterminated CDATA section');
            const top = stack[stack.length - 1];
            if (!top) fail('CDATA outside the root element');
            top!.text += source.slice(i + 9, end).replaceAll('&', '&amp;');
            i = end + 3;
            continue;
        }
        if (source.startsWith('<?', i)) {
            const end = source.indexOf('?>', i);
            if (end === -1) fail('unterminated processing instruction');
            i = end + 2;
            continue;
        }
        if (source.startsWith('<!', i)) {
            const end = source.indexOf('>', i);
            if (end === -1) fail('unterminated declaration');
            i = end + 1;
            continue;
        }
        const gt = findTagEnd(source, i);
        if (gt === -1) fail('unterminated tag');
        if (source[i + 1] === '/') {
            const name = stripPrefix(source.slice(i + 2, gt).trim());
            const frame = stack.pop();
            if (!frame) fail(`unexpected closing tag </${name}>`);
            if (frame!.name !== name) fail(`expected </${frame!.name}> but found </${name}>`);
            finish(frame!);
            i = gt + 1;
            continue;
        }
        const selfClosing = source[gt - 1] === '/';
        const body = source.slice(i + 1, selfClosing ? gt - 1 : gt).trim();
        const spaceAt = body.search(/\s/);
        const rawName = spaceAt === -1 ? body : body.slice(0, spaceAt);
        if (rawName === '') fail('empty tag name');
        const attrs: Array<readonly [string, string]> = [];
        if (spaceAt !== -1) {
            const attrSource = body.slice(spaceAt);
            const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
            let m: RegExpExecArray | null = attrRe.exec(attrSource);
            while (m !== null) {
                attrs.push([m[1]!, decodeEntities(m[3] ?? m[4] ?? '')]);
                m = attrRe.exec(attrSource);
            }
        }
        const frame: Frame = { name: stripPrefix(rawName), attrs, children: [], text: '' };
        if (selfClosing) finish(frame);
        else stack.push(frame);
        i = gt + 1;
    }
    if (stack.length > 0)
        throw new SyntaxError(`unclosed element <${stack[stack.length - 1]!.name}>`);
    if (!root) throw new SyntaxError('no root element found');
    return root;
};
