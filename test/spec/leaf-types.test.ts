import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import { ATTR, GENRE, LABEL, PRICE_TIER, PROPRIETARY_ID, TEXT } from '../../src/spec/v3_4';

const render = <I>(type: Parameters<typeof buildNode<I>>[0], input: I, el: string) => {
    const issues: Issue[] = [];
    const xml = serialize(
        buildNode(type, input, el, { path: '', issues, onIllegalChars: 'error' }),
        {
            xmlDeclaration: false,
        },
    );
    return { xml, issues };
};

describe('ATTR', () => {
    test('emits type, key, value in order', () => {
        const { xml, issues } = render(
            ATTR,
            { type: 'string', key: 'ss_id', value: '1234' },
            'attr',
        );
        expect(issues).toHaveLength(0);
        expect(xml.replace(/\s+/g, '')).toBe(
            '<attr><type>string</type><key>ss_id</key><value>1234</value></attr>',
        );
    });
    test('omits an absent type', () => {
        expect(render(ATTR, { key: 'k', value: 'v' }, 'attr').xml).not.toContain('<type>');
    });
    test('rejects a type outside attr_type_type', () => {
        const { issues } = render(ATTR, { type: 'bogus', key: 'k', value: 'v' }, 'attr');
        expect(issues.map((i) => i.code)).toContain('enum');
    });
    test('requires key and value', () => {
        expect(render(ATTR, {}, 'attr').issues.map((i) => i.path)).toEqual(['key', 'value']);
    });
});

describe('PROPRIETARY_ID', () => {
    test('emits type and id', () => {
        const { xml } = render(PROPRIETARY_ID, { type: 'spotify', id: 'abc' }, 'artist_id');
        expect(xml.replace(/\s+/g, '')).toBe(
            '<artist_id><type>spotify</type><id>abc</id></artist_id>',
        );
    });
});

describe('GENRE', () => {
    test('emits primary alone', () => {
        expect(render(GENRE, { primary: 'Pop' }, 'genre').xml).not.toContain('<sub>');
    });
    test('emits primary and sub in order', () => {
        const { xml } = render(GENRE, { primary: 'Pop', sub: 'Adult Contemporary' }, 'genre');
        expect(xml.indexOf('<primary>')).toBeLessThan(xml.indexOf('<sub>'));
    });
});

describe('PRICE_TIER', () => {
    test('requires both type and name', () => {
        expect(render(PRICE_TIER, {}, 'price_tier').issues).toHaveLength(2);
    });
});

describe('TEXT', () => {
    test('preserves multi-line content verbatim', () => {
        const content = 'line one\nline two';
        expect(render(TEXT, { content }, 'text').xml).toContain(content);
    });
    test('requires content', () => {
        expect(render(TEXT, {}, 'text').issues[0]).toMatchObject({
            path: 'content',
            code: 'required',
        });
    });
});

describe('LABEL', () => {
    test('requires only name', () => {
        expect(render(LABEL, { name: 'Slingshot Records' }, 'label').issues).toHaveLength(0);
    });
    // 0.1.x omitted url and notes entirely, though both are in the XSD.
    test('supports url and notes', () => {
        const { xml } = render(
            LABEL,
            {
                name: 'N',
                city: 'C',
                state: 'S',
                country: 'United States',
                url: 'https://x.test',
                notes: 'hi',
            },
            'label',
        );
        expect(xml).toContain('<url>https://x.test</url>');
        expect(xml).toContain('<notes>hi</notes>');
    });
    test('emits fields in XSD order', () => {
        const { xml } = render(
            LABEL,
            {
                vendorLabelID: '1',
                name: 'N',
                city: 'C',
                state: 'S',
                country: 'US',
                url: 'u',
                notes: 'n',
            },
            'label',
        );
        const order = ['vendor_label_id', 'name', 'city', 'state', 'country', 'url', 'notes'];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});
