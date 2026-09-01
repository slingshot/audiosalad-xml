import { describe, expect, test } from 'bun:test';
import { parseXml } from '../../src/core/parse';

describe('parseXml', () => {
    test('parses a leaf element', () => {
        const r = parseXml('<a>hello</a>');
        expect(r.name).toBe('a');
        expect(r.text).toBe('hello');
    });

    test('parses nested elements', () => {
        const r = parseXml('<a><b>1</b><c>2</c></a>');
        expect(r.children.map((c) => c.name)).toEqual(['b', 'c']);
        expect(r.children[0]?.text).toBe('1');
    });

    test('parses attributes', () => {
        const r = parseXml('<a x="1" y=\'2\'/>');
        expect(r.attrs).toEqual([
            ['x', '1'],
            ['y', '2'],
        ]);
    });

    test('handles self-closing elements', () => {
        const r = parseXml('<a><b/></a>');
        expect(r.children[0]?.name).toBe('b');
        expect(r.children[0]?.children).toEqual([]);
    });

    test('skips the XML declaration, comments, and processing instructions', () => {
        const r = parseXml('<?xml version="1.0"?><!-- hi --><?pi go?><a>x</a>');
        expect(r.name).toBe('a');
        expect(r.text).toBe('x');
    });

    test('decodes the five predefined entities', () => {
        expect(parseXml('<a>&amp;&lt;&gt;&quot;&apos;</a>').text).toBe(`&<>"'`);
    });

    test('decodes decimal and hex character references', () => {
        expect(parseXml('<a>&#65;&#x42;</a>').text).toBe('AB');
    });

    test('decodes astral character references', () => {
        expect(parseXml('<a>&#x1F3B5;</a>').text).toBe('\u{1F3B5}');
    });

    test('reads CDATA verbatim', () => {
        expect(parseXml('<a><![CDATA[x < y & z]]></a>').text).toBe('x < y & z');
    });

    test('preserves newlines in leaf text', () => {
        expect(parseXml('<a>one\ntwo</a>').text).toBe('one\ntwo');
    });

    test('drops whitespace between element children', () => {
        const r = parseXml('<a>\n    <b>1</b>\n</a>');
        expect(r.children).toHaveLength(1);
        expect(r.text).toBeUndefined();
    });

    test('strips namespace prefixes', () => {
        const r = parseXml('<ns:a xmlns:ns="u"><ns:b>1</ns:b></ns:a>');
        expect(r.name).toBe('a');
        expect(r.children[0]?.name).toBe('b');
    });

    test('throws on a mismatched closing tag', () => {
        expect(() => parseXml('<a><b></c></a>')).toThrow(SyntaxError);
    });

    test('throws on an unclosed element', () => {
        expect(() => parseXml('<a><b></a>')).toThrow(SyntaxError);
    });

    test('throws when there is no root element', () => {
        expect(() => parseXml('   ')).toThrow(SyntaxError);
    });

    test('throws on trailing content after the root', () => {
        expect(() => parseXml('<a/><b/>')).toThrow(SyntaxError);
    });
});

describe('parseXml hardening', () => {
    test('accepts an unescaped > inside an attribute value', () => {
        // XML does not require > to be escaped in attribute values.
        expect(parseXml('<a x="p>q"/>').attrs).toEqual([['x', 'p>q']]);
    });

    test('accepts a /> sequence inside an attribute value', () => {
        const r = parseXml('<a x="p/>q">text</a>');
        expect(r.attrs).toEqual([['x', 'p/>q']]);
        expect(r.text).toBe('text');
    });

    test('throws SyntaxError on an out-of-range character reference', () => {
        expect(() => parseXml('<a>&#x110000;</a>')).toThrow(SyntaxError);
    });

    test('throws on text trailing the root element', () => {
        expect(() => parseXml('<a/>trailing')).toThrow(SyntaxError);
    });

    test('leaves an unknown entity untouched', () => {
        expect(parseXml('<a>&nbsp;</a>').text).toBe('&nbsp;');
    });

    test('does not confuse a ]] inside CDATA for its terminator', () => {
        expect(parseXml('<a><![CDATA[a]]b]]></a>').text).toBe('a]]b');
    });

    test('skips a doctype declaration', () => {
        expect(parseXml('<!DOCTYPE a><a>x</a>').text).toBe('x');
    });

    test('handles identically named nesting', () => {
        expect(parseXml('<a><a><a>x</a></a></a>').children[0]?.children[0]?.text).toBe('x');
    });
});
