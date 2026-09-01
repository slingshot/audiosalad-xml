import { buildNode, parseNode } from './core/descriptor';
import { AudioSaladValidationError, type Issue } from './core/issues';
import type { XmlElement } from './core/node';
import { parseXml } from './core/parse';
import { type SerializeOptions, serialize } from './core/serialize';
import type { ReleaseInput } from './model';
import { RELEASE, ROOT_ATTRS, SCHEMA_NAMESPACE } from './spec/v3_4';

export interface BuildOptions extends SerializeOptions {
    /**
     * Suppress the `AudioSaladValidationError` that invalid input would
     * otherwise raise. Default `true` (validate and throw).
     *
     * This does **not** mean "emit whatever you were given". A value that
     * cannot be formatted at all — a malformed date, a non-integer where the
     * schema wants `xs:unsignedInt`, a string holding a character XML cannot
     * represent — is still omitted from the output, because there is nothing
     * legal to write. Facet violations (a bad ISRC, a short UPC) *are* emitted.
     * Use this to inspect partial output while debugging, not to bypass the
     * schema.
     */
    validate?: boolean;
    /**
     * What to do with characters XML cannot represent. `'error'` reports an
     * issue; `'strip'` removes them. Default `'error'`.
     */
    onIllegalChars?: 'error' | 'strip';
}

export interface ParseOptions {
    /** What to do with elements the v3.4 schema does not define. Default `'error'`. */
    onUnknownElement?: 'error' | 'ignore';
}

const buildTree = (
    input: ReleaseInput,
    onIllegalChars: 'error' | 'strip',
): { node: XmlElement; issues: Issue[] } => {
    const issues: Issue[] = [];
    const bare = buildNode(RELEASE, input, 'release', { path: '', issues, onIllegalChars });
    return { node: { ...bare, attrs: ROOT_ATTRS }, issues };
};

/**
 * Validates a release without building XML. Never throws.
 *
 * @returns every problem found, with paths into the input object
 *   (`tracks[0].isrc`), or an empty array when the input is valid.
 */
export const validateRelease = (input: ReleaseInput): Issue[] => buildTree(input, 'error').issues;

/**
 * Builds AudioSalad release XML conforming to schema v3.4.
 *
 * @throws {AudioSaladValidationError} when the input is invalid, carrying
 *   *every* issue rather than only the first. Pass `{ validate: false }` to
 *   emit regardless.
 */
export const buildRelease = (input: ReleaseInput, opts: BuildOptions = {}): string => {
    const { node, issues } = buildTree(input, opts.onIllegalChars ?? 'error');
    if (opts.validate !== false && issues.length > 0) {
        throw new AudioSaladValidationError(issues);
    }
    return serialize(node, opts);
};

/**
 * Parses AudioSalad release XML back into a typed input object.
 *
 * Validation happens during parsing, so a document that is well-formed XML but
 * not a valid v3.4 release — the wrong namespace or `schema_id`, a missing
 * required element, duplicated singletons, children out of sequence order, or a
 * non-numeric integer — is rejected rather than returned as a `ReleaseInput`
 * that never held those values.
 *
 * @throws {SyntaxError} when the document is not well-formed XML.
 * @throws {AudioSaladValidationError} when it is not a valid v3.4 release.
 *   `{ onUnknownElement: 'ignore' }` relaxes only the unknown-element check.
 */
export const parseRelease = (xml: string, opts: ParseOptions = {}): ReleaseInput => {
    const root = parseXml(xml);
    if (root.name !== 'release') {
        throw new SyntaxError(`expected a <release> root element, found <${root.name}>`);
    }
    const issues: Issue[] = [];

    // The namespace is the first thing that distinguishes a v3.4 document from
    // a v3.2 one; `parseNode` then checks the `schema_id` fixed value.
    const ns = root.attrs.find(([k]) => k === 'xmlns')?.[1];
    if (ns !== undefined && ns !== SCHEMA_NAMESPACE) {
        issues.push({
            path: 'xmlns',
            code: 'enum',
            message: `expected namespace "${SCHEMA_NAMESPACE}", found "${ns}"`,
        });
    }

    const out = parseNode(RELEASE, root, {
        path: '',
        issues,
        onUnknownElement: opts.onUnknownElement ?? 'error',
    });
    if (issues.length > 0) throw new AudioSaladValidationError(issues);
    return out;
};

export type { Issue, IssueCode } from './core/issues';
export { AudioSaladValidationError };
