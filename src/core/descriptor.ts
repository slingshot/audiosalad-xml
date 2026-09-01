import {
    type DateLike,
    formatDate,
    formatDateTime,
    formatGYear,
    formatPartialDate,
} from './datetime';
import { type Issue, issue } from './issues';
import { el, leaf, type XmlElement } from './node';
import { findIllegalChar } from './serialize';

export type Kind =
    | 'string'
    | 'unsignedInt'
    | 'boolean'
    | 'date'
    | 'dateTime'
    | 'gYear'
    | 'partialDate'
    | 'complex';

export interface FieldDescriptor<I> {
    /** XML element name. **Table order is the XSD sequence order.** */
    readonly el: string;
    /** Key on the input object. Omitted for `const` fields. */
    readonly key?: keyof I & string;
    readonly kind: Kind;
    /** minOccurs */
    readonly min: 0 | 1;
    /** maxOccurs; `Number.POSITIVE_INFINITY` for unbounded. */
    readonly max: number;
    /** Required when `kind === 'complex'`. */
    readonly type?: AnyComplexType;
    /** A fixed value emitted regardless of input, e.g. `schema_id`. */
    readonly const?: string;
    readonly pattern?: RegExp;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly values?: readonly string[];
}

export interface ComplexType<I> {
    /** XSD complexType name, used in issue messages. */
    readonly name: string;
    readonly fields: ReadonlyArray<FieldDescriptor<I>>;
}

/**
 * A table referencing a child table of an unrelated input type. `ComplexType`
 * is invariant in `I` (it appears in `keyof I`), so a precise type here would
 * force a cast at every reference site instead of one declaration.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above
export type AnyComplexType = ComplexType<any>;

export interface BuildCtx {
    path: string;
    issues: Issue[];
    onIllegalChars: 'error' | 'strip';
}

export interface ParseCtx {
    path: string;
    issues: Issue[];
    onUnknownElement: 'error' | 'ignore';
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: the point of this pattern is to strip XML-illegal control characters
const ILLEGAL_GLOBAL = /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu;

const join = (base: string, key: string): string => (base === '' ? key : `${base}.${key}`);

/** `xs:unsignedInt` is a 32-bit unsigned value. */
const UNSIGNED_INT_MAX = 4_294_967_295;

const isDateLike = (v: unknown): v is DateLike => v instanceof Date || typeof v === 'string';

/** A short, safe rendering of an unexpected value for an issue message. */
const describe = (v: unknown): string => {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'an array';
    if (v instanceof Date) return 'a Date';
    return typeof v;
};

/** Formats one scalar value, pushing an issue and returning undefined on failure. */
/**
 * Applies the XSD simple-type facets a descriptor declares. Shared by
 * `buildNode` and `parseNode` so the two directions cannot disagree about what
 * the schema allows — a facet enforced on the way out but not on the way in
 * would let `parseRelease` return an object that `buildRelease` then rejects.
 */
const checkFacets = <I>(
    f: FieldDescriptor<I>,
    value: string,
    path: string,
    issues: Issue[],
): void => {
    if (f.pattern && !f.pattern.test(value)) {
        issues.push(issue(path, 'pattern', `"${value}" does not match ${String(f.pattern)}`));
    }
    if (f.minLength !== undefined && value.length < f.minLength) {
        issues.push(issue(path, 'minLength', `must be at least ${f.minLength} characters`));
    }
    if (f.maxLength !== undefined && value.length > f.maxLength) {
        issues.push(issue(path, 'maxLength', `must be at most ${f.maxLength} characters`));
    }
    if (f.values && !f.values.includes(value)) {
        issues.push(issue(path, 'enum', `"${value}" is not one of: ${f.values.join(', ')}`));
    }
};

const formatScalar = <I>(
    f: FieldDescriptor<I>,
    raw: unknown,
    path: string,
    ctx: BuildCtx,
): string | undefined => {
    let out: string | undefined;

    const wrongType = (expected: string): undefined => {
        ctx.issues.push(issue(path, 'type', `expected ${expected}, got ${describe(raw)}`));
        return undefined;
    };

    switch (f.kind) {
        case 'string':
            // No String(raw) coercion: `title: 123` is a mistake, not a string.
            if (typeof raw !== 'string') return wrongType('a string');
            out = raw;
            break;
        case 'unsignedInt':
            if (typeof raw !== 'number' || !Number.isInteger(raw)) return wrongType('an integer');
            if (raw < 0 || raw > UNSIGNED_INT_MAX) {
                ctx.issues.push(
                    issue(path, 'type', `must be between 0 and ${UNSIGNED_INT_MAX}, got ${raw}`),
                );
                return undefined;
            }
            out = String(raw);
            break;
        case 'boolean':
            if (typeof raw !== 'boolean') return wrongType('a boolean');
            out = raw ? 'true' : 'false';
            break;
        case 'date':
            if (!isDateLike(raw)) return wrongType('a Date or string');
            out = formatDate(raw);
            break;
        case 'dateTime':
            if (!isDateLike(raw)) return wrongType('a Date or string');
            out = formatDateTime(raw);
            break;
        case 'gYear':
            if (!isDateLike(raw) && typeof raw !== 'number') {
                return wrongType('a Date, string, or number');
            }
            out = formatGYear(raw);
            break;
        case 'partialDate':
            if (!isDateLike(raw)) return wrongType('a Date or string');
            out = formatPartialDate(raw);
            break;
        case 'complex':
            return undefined;
    }

    if (out === undefined) {
        ctx.issues.push(issue(path, 'type', `value is not a valid ${f.kind}: ${String(raw)}`));
        return undefined;
    }

    const bad = findIllegalChar(out);
    if (bad !== undefined) {
        if (ctx.onIllegalChars === 'strip') {
            out = out.replace(ILLEGAL_GLOBAL, '');
        } else {
            const code = bad.codePointAt(0) ?? 0;
            ctx.issues.push(
                issue(
                    path,
                    'illegalChar',
                    `contains U+${code.toString(16).toUpperCase().padStart(4, '0')}, which XML cannot represent`,
                ),
            );
            return undefined;
        }
    }

    checkFacets(f, out, path, ctx.issues);

    return out;
};

/**
 * Walks a descriptor table in order, producing an element tree and collecting
 * every validation issue in one pass. `validateRelease` is just this function
 * with the tree thrown away, so validation and serialization cannot disagree.
 */
export const buildNode = <I>(
    type: ComplexType<I>,
    input: I,
    elName: string,
    ctx: BuildCtx,
): XmlElement => {
    const children: XmlElement[] = [];

    for (const f of type.fields) {
        if (f.const !== undefined) {
            children.push(leaf(f.el, f.const));
            continue;
        }
        if (f.key === undefined) continue;

        const raw = (input as Record<string, unknown>)[f.key];
        const fieldPath = join(ctx.path, f.key);
        const repeated = f.max > 1;

        if (raw === undefined || raw === null) {
            if (f.min === 1) {
                ctx.issues.push(issue(fieldPath, 'required', `${f.el} is required`));
            }
            continue;
        }

        if (repeated && !Array.isArray(raw)) {
            // Catches the 0.1.x shape `Permission.type: 'stream'`, which must
            // now be `['stream']`. Silently wrapping it would hide the break.
            ctx.issues.push(
                issue(fieldPath, 'cardinality', `${f.el} expects an array, got ${describe(raw)}`),
            );
            continue;
        }

        const values = repeated ? (raw as unknown[]) : [raw];

        if (repeated && f.min === 1 && values.length === 0) {
            ctx.issues.push(issue(fieldPath, 'required', `at least one ${f.el} is required`));
            continue;
        }
        if (!repeated && Array.isArray(raw)) {
            ctx.issues.push(issue(fieldPath, 'cardinality', `${f.el} accepts a single value`));
            continue;
        }
        if (values.length > f.max) {
            ctx.issues.push(
                issue(fieldPath, 'cardinality', `at most ${f.max} ${f.el} element(s) allowed`),
            );
            continue;
        }

        values.forEach((value, index) => {
            const path = repeated ? `${fieldPath}[${index}]` : fieldPath;
            if (f.kind === 'complex') {
                const sub = f.type;
                if (!sub) throw new Error(`descriptor ${type.name}.${f.el} lacks a complex type`);
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    ctx.issues.push(
                        issue(path, 'type', `expected an object, got ${describe(value)}`),
                    );
                    return;
                }
                children.push(buildNode(sub, value, f.el, { ...ctx, path }));
                return;
            }
            const text = formatScalar(f, value, path, ctx);
            if (text !== undefined) children.push(leaf(f.el, text));
        });
    }

    return el(elName, children);
};

/**
 * Reverses the scalar formatting done by `buildNode`, reporting both lexical
 * errors and facet violations. Returns `undefined` when the text cannot be
 * represented as the declared kind, so the caller omits the key rather than
 * handing back a value that contradicts its own TypeScript type.
 */
const parseScalar = <I>(
    f: FieldDescriptor<I>,
    text: string,
    path: string,
    ctx: ParseCtx,
): unknown => {
    switch (f.kind) {
        case 'unsignedInt': {
            if (!/^\d+$/.test(text)) {
                ctx.issues.push(issue(path, 'type', `<${f.el}> must be an integer, got "${text}"`));
                return undefined;
            }
            const n = Number(text);
            if (n > UNSIGNED_INT_MAX) {
                ctx.issues.push(
                    issue(path, 'type', `<${f.el}> exceeds the xs:unsignedInt maximum`),
                );
                return undefined;
            }
            return n;
        }
        case 'boolean': {
            if (!['true', 'false', '1', '0'].includes(text)) {
                ctx.issues.push(issue(path, 'type', `<${f.el}> must be a boolean, got "${text}"`));
                return undefined;
            }
            return text === 'true' || text === '1';
        }
        case 'gYear': {
            // Must not fall through to the raw string: ReleaseInput.cYear is
            // typed `number`, and returning text here would be an unsound cast.
            if (formatGYear(text) === undefined) {
                ctx.issues.push(issue(path, 'type', `<${f.el}> must be a four-digit year`));
                return undefined;
            }
            return Number(text);
        }
        case 'date':
        case 'dateTime':
        case 'partialDate': {
            const formatter =
                f.kind === 'date'
                    ? formatDate
                    : f.kind === 'dateTime'
                      ? formatDateTime
                      : formatPartialDate;
            if (formatter(text) === undefined) {
                ctx.issues.push(
                    issue(path, 'type', `<${f.el}> is not a valid ${f.kind}: "${text}"`),
                );
                return undefined;
            }
            checkFacets(f, text, path, ctx.issues);
            return text;
        }
        default:
            // Facets are declared on the table; enforcing them only when
            // building would let parseRelease accept XML the XSD rejects.
            checkFacets(f, text, path, ctx.issues);
            return text;
    }
};

/**
 * Inverts `buildNode`, and validates while it does so.
 *
 * A parser that accepts anything and returns a value typed `ReleaseInput` is a
 * lie: a v3.2 document, a duplicated `<title>`, or out-of-order children would
 * all "succeed". Re-running `buildNode` on the result cannot recover those —
 * duplicates, ordering, and fixed values are already lost. So the checks happen
 * here, while the children are being consumed.
 */
export const parseNode = <I>(type: ComplexType<I>, node: XmlElement, ctx: ParseCtx): I => {
    const out: Record<string, unknown> = {};
    const counts = new Map<string, number>();
    const indexOfField = new Map<string, number>();
    type.fields.forEach((f, i) => {
        indexOfField.set(f.el, i);
    });

    let cursor = 0;

    for (const child of node.children) {
        const fieldIndex = indexOfField.get(child.name);
        if (fieldIndex === undefined) {
            if (ctx.onUnknownElement === 'error') {
                ctx.issues.push(
                    issue(
                        join(ctx.path, child.name),
                        'unknownElement',
                        `<${child.name}> is not part of ${type.name}`,
                    ),
                );
            }
            continue;
        }
        const f = type.fields[fieldIndex] as FieldDescriptor<I>;

        if (fieldIndex < cursor) {
            ctx.issues.push(
                issue(
                    join(ctx.path, f.key ?? f.el),
                    'cardinality',
                    `<${child.name}> is out of sequence order in ${type.name}`,
                ),
            );
        } else {
            cursor = fieldIndex;
        }

        const seen = (counts.get(f.el) ?? 0) + 1;
        counts.set(f.el, seen);
        if (seen > f.max) {
            ctx.issues.push(
                issue(
                    join(ctx.path, f.key ?? f.el),
                    'cardinality',
                    `at most ${f.max} <${f.el}> element(s) allowed, found ${seen}`,
                ),
            );
            continue;
        }

        if (f.const !== undefined) {
            if ((child.text ?? '') !== f.const) {
                ctx.issues.push(
                    issue(
                        join(ctx.path, f.el),
                        'enum',
                        `<${f.el}> must be "${f.const}", got "${child.text ?? ''}"`,
                    ),
                );
            }
            continue;
        }
        if (f.key === undefined) continue;

        const repeated = f.max > 1;
        const fieldPath = join(ctx.path, f.key);
        const path = repeated ? `${fieldPath}[${seen - 1}]` : fieldPath;

        let value: unknown;
        if (f.kind === 'complex') {
            const sub = f.type;
            if (!sub) throw new Error(`descriptor ${type.name}.${f.el} lacks a complex type`);
            value = parseNode(sub, child, { ...ctx, path });
        } else {
            value = parseScalar(f, child.text ?? '', path, ctx);
            if (value === undefined) continue;
        }

        if (repeated) {
            const list = (out[f.key] as unknown[] | undefined) ?? [];
            list.push(value);
            out[f.key] = list;
        } else {
            out[f.key] = value;
        }
    }

    for (const f of type.fields) {
        if (f.min === 1 && (counts.get(f.el) ?? 0) === 0) {
            ctx.issues.push(
                issue(
                    join(ctx.path, f.key ?? f.el),
                    'required',
                    `<${f.el}> is required by ${type.name}`,
                ),
            );
        }
    }

    return out as I;
};
