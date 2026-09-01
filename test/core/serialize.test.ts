import { describe, expect, test } from 'bun:test';
import { el, leaf } from '../../src/core/node';
import { escapeText, findIllegalChar, serialize } from '../../src/core/serialize';

describe('escapeText', () => {
    test('escapes the five predefined entities', () => {
        expect(escapeText(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
    });

    test('leaves tab, newline, and carriage return alone', () => {
        expect(escapeText('a\tb\nc\rd')).toBe('a\tb\nc\rd');
    });
});

describe('findIllegalChar', () => {
    // Defect 5: xml-escape passed these straight through, producing documents
    // that no conformant parser will accept.
    test('detects a C0 control character', () => {
        expect(findIllegalChar(`Bad${String.fromCharCode(7)}Title`)).toBe('');
    });

    test('detects a lone surrogate', () => {
        expect(findIllegalChar(`x${String.fromCharCode(0xd800)}y`)).toBe('\ud800');
    });

    test('accepts astral plane characters', () => {
        expect(findIllegalChar('emoji \u{1F3B5} ok')).toBeUndefined();
    });

    test('accepts CJK and accented text', () => {
        expect(findIllegalChar('椎名林檎 — Café')).toBeUndefined();
    });
});

describe('serialize', () => {
    test('emits an XML declaration by default', () => {
        expect(serialize(leaf('a', 'x'))).toStartWith('<?xml version="1.0" encoding="UTF-8"?>\n');
    });

    test('omits the declaration when asked', () => {
        expect(serialize(leaf('a', 'x'), { xmlDeclaration: false })).toBe('<a>x</a>');
    });

    test('indents nested elements with four spaces', () => {
        const tree = el('root', [leaf('a', '1'), el('b', [leaf('c', '2')])]);
        expect(serialize(tree, { xmlDeclaration: false })).toBe(
            ['<root>', '    <a>1</a>', '    <b>', '        <c>2</c>', '    </b>', '</root>'].join(
                '\n',
            ),
        );
    });

    test('emits attributes in insertion order', () => {
        const tree = el(
            'r',
            [],
            [
                ['xmlns', 'ns'],
                ['b', '2'],
            ],
        );
        expect(serialize(tree, { xmlDeclaration: false })).toBe('<r xmlns="ns" b="2"/>');
    });

    test('preserves multi-line leaf content verbatim', () => {
        // The old pipeline set collapseContent: true, which mangled lyrics.
        const tree = el('t', [leaf('content', 'line one\nline two')]);
        expect(serialize(tree, { xmlDeclaration: false })).toContain('line one\nline two');
    });

    test('escapes leaf text and attribute values', () => {
        const tree = el('r', [leaf('a', 'x & y')], [['v', 'p<q']]);
        const out = serialize(tree, { xmlDeclaration: false });
        expect(out).toContain('<a>x &amp; y</a>');
        expect(out).toContain('v="p&lt;q"');
    });

    test('self-closes empty elements', () => {
        expect(serialize(el('a', []), { xmlDeclaration: false })).toBe('<a/>');
    });

    test('uses \\n line endings', () => {
        expect(serialize(el('a', [leaf('b', '1')]), { xmlDeclaration: false })).not.toContain('\r');
    });
});
