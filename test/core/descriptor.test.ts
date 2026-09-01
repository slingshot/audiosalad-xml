import { describe, expect, test } from 'bun:test';
import { buildNode, type ComplexType, parseNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { parseXml } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

interface ChildInput {
    id: string;
}
interface ToyInput {
    name: string;
    count?: number;
    flag?: boolean;
    when?: Date | string;
    tags?: string[];
    kids?: ChildInput[];
    code?: string;
}

const CHILD: ComplexType<ChildInput> = {
    name: 'child_type',
    fields: [{ el: 'id', key: 'id', kind: 'string', min: 1, max: 1 }],
};

const TOY: ComplexType<ToyInput> = {
    name: 'toy_type',
    fields: [
        { el: 'schema_id', kind: 'string', min: 1, max: 1, const: 'toy_v1' },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'count', key: 'count', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'flag', key: 'flag', kind: 'boolean', min: 0, max: 1 },
        { el: 'when', key: 'when', kind: 'dateTime', min: 0, max: 1 },
        { el: 'tag', key: 'tags', kind: 'string', min: 0, max: Number.POSITIVE_INFINITY },
        {
            el: 'kid',
            key: 'kids',
            kind: 'complex',
            type: CHILD,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
        {
            el: 'code',
            key: 'code',
            kind: 'string',
            min: 0,
            max: 1,
            pattern: /^[A-Z]{2}$/,
            minLength: 2,
            maxLength: 2,
        },
    ],
};

const build = (input: ToyInput) => {
    const issues: Issue[] = [];
    const node = buildNode(TOY, input, 'toy', { path: '', issues, onIllegalChars: 'error' });
    return { xml: serialize(node, { xmlDeclaration: false }), issues };
};

describe('buildNode', () => {
    test('emits const fields without reading the input', () => {
        expect(build({ name: 'x' }).xml).toContain('<schema_id>toy_v1</schema_id>');
    });

    test('emits fields in table order regardless of input key order', () => {
        const { xml } = build({ tags: ['t'], count: 1, name: 'x' });
        expect(xml.indexOf('<name>')).toBeLessThan(xml.indexOf('<count>'));
        expect(xml.indexOf('<count>')).toBeLessThan(xml.indexOf('<tag>'));
    });

    // Defect 4: the 0.1.x code used `this.count ? ... : ''`, so a real zero vanished.
    test('emits a numeric zero', () => {
        expect(build({ name: 'x', count: 0 }).xml).toContain('<count>0</count>');
    });

    // Defect 4, boolean form: `compilation: false` was silently dropped.
    test('emits a false boolean', () => {
        expect(build({ name: 'x', flag: false }).xml).toContain('<flag>false</flag>');
    });

    test('omits absent optional fields', () => {
        expect(build({ name: 'x' }).xml).not.toContain('<count>');
    });

    // Defects 1-3: repeated children were built with forEach and vanished.
    test('emits every element of an unbounded simple field', () => {
        const { xml } = build({ name: 'x', tags: ['a', 'b', 'c'] });
        expect(xml.match(/<tag>/g)).toHaveLength(3);
    });

    test('emits every element of an unbounded complex field', () => {
        const { xml } = build({ name: 'x', kids: [{ id: '1' }, { id: '2' }] });
        expect(xml.match(/<kid>/g)).toHaveLength(2);
        expect(xml).toContain('<id>1</id>');
        expect(xml).toContain('<id>2</id>');
    });

    test('reports a missing required field', () => {
        const { issues } = build({ name: undefined as unknown as string });
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ path: 'name', code: 'required' });
    });

    test('reports a pattern violation with a path', () => {
        const { issues } = build({ name: 'x', code: 'abc' });
        expect(issues.map((i) => i.code)).toContain('pattern');
        expect(issues[0]?.path).toBe('code');
    });

    test('paths into arrays are indexed', () => {
        const { issues } = build({
            name: 'x',
            kids: [{ id: 'ok' }, { id: undefined as unknown as string }],
        });
        expect(issues[0]?.path).toBe('kids[1].id');
    });

    test('reports a non-integer where unsignedInt is required', () => {
        expect(build({ name: 'x', count: 1.5 }).issues.map((i) => i.code)).toContain('type');
        expect(build({ name: 'x', count: -1 }).issues.map((i) => i.code)).toContain('type');
    });

    test('reports an unformattable date', () => {
        expect(build({ name: 'x', when: 'not-a-date' }).issues.map((i) => i.code)).toContain(
            'type',
        );
    });

    // Defect 5.
    test('reports an XML-illegal character', () => {
        const { issues } = build({ name: `Bad${String.fromCharCode(7)}Name` });
        expect(issues[0]).toMatchObject({ path: 'name', code: 'illegalChar' });
    });

    test('strips illegal characters when asked', () => {
        const issues: Issue[] = [];
        const node = buildNode(TOY, { name: `Bad${String.fromCharCode(7)}Name` }, 'toy', {
            path: '',
            issues,
            onIllegalChars: 'strip',
        });
        expect(issues).toHaveLength(0);
        expect(serialize(node, { xmlDeclaration: false })).toContain('<name>BadName</name>');
    });

    test('reports too few occurrences of a required repeated field', () => {
        const REQ: ComplexType<{ kids?: ChildInput[] }> = {
            name: 'req_type',
            fields: [
                {
                    el: 'kid',
                    key: 'kids',
                    kind: 'complex',
                    type: CHILD,
                    min: 1,
                    max: Number.POSITIVE_INFINITY,
                },
            ],
        };
        const issues: Issue[] = [];
        buildNode(REQ, {}, 'r', { path: '', issues, onIllegalChars: 'error' });
        expect(issues[0]).toMatchObject({ code: 'required' });
    });

    test('reports too many occurrences of a bounded repeated field', () => {
        const BOUNDED: ComplexType<{ kids?: ChildInput[] }> = {
            name: 'bounded_type',
            fields: [{ el: 'kid', key: 'kids', kind: 'complex', type: CHILD, min: 0, max: 2 }],
        };
        const issues: Issue[] = [];
        buildNode(BOUNDED, { kids: [{ id: '1' }, { id: '2' }, { id: '3' }] }, 'b', {
            path: '',
            issues,
            onIllegalChars: 'error',
        });
        expect(issues[0]).toMatchObject({ path: 'kids', code: 'cardinality' });
    });
});

describe('buildNode type guards', () => {
    test('does not coerce a number into a string field', () => {
        expect(build({ name: 123 as unknown as string }).issues[0]).toMatchObject({
            path: 'name',
            code: 'type',
        });
    });

    test('enforces the xs:unsignedInt 32-bit maximum', () => {
        expect(build({ name: 'x', count: 4_294_967_296 }).issues[0]).toMatchObject({
            code: 'type',
        });
        expect(build({ name: 'x', count: 4_294_967_295 }).issues).toEqual([]);
    });

    test('reports a bad date rather than throwing inside a formatter', () => {
        expect(() => build({ name: 'x', when: 12345 as unknown as Date })).not.toThrow();
        expect(build({ name: 'x', when: 12345 as unknown as Date }).issues[0]).toMatchObject({
            path: 'when',
            code: 'type',
        });
    });

    test('requires an array for a repeated field', () => {
        // The 0.1.x `Permission.type: 'stream'` shape must surface, not be wrapped.
        expect(build({ name: 'x', tags: 'one' as unknown as string[] }).issues[0]).toMatchObject({
            path: 'tags',
            code: 'cardinality',
        });
    });

    test('reports null inside a complex array rather than crashing', () => {
        const input = { name: 'x', kids: [null] as unknown as ChildInput[] };
        expect(() => build(input)).not.toThrow();
        expect(build(input).issues[0]).toMatchObject({ path: 'kids[0]', code: 'type' });
    });
});

describe('parseNode', () => {
    const roundTrip = (input: ToyInput): ToyInput => {
        const issues: Issue[] = [];
        const node = buildNode(TOY, input, 'toy', { path: '', issues, onIllegalChars: 'error' });
        const xml = serialize(node, { xmlDeclaration: false });
        return parseNode(TOY, parseXml(xml), { path: '', issues, onUnknownElement: 'error' });
    };

    test('recovers scalars', () => {
        expect(roundTrip({ name: 'x', count: 7, flag: true })).toMatchObject({
            name: 'x',
            count: 7,
            flag: true,
        });
    });

    test('recovers a numeric zero', () => {
        expect(roundTrip({ name: 'x', count: 0 }).count).toBe(0);
    });

    test('recovers repeated simple fields', () => {
        expect(roundTrip({ name: 'x', tags: ['a', 'b'] }).tags).toEqual(['a', 'b']);
    });

    test('recovers repeated complex fields', () => {
        expect(roundTrip({ name: 'x', kids: [{ id: '1' }] }).kids).toEqual([{ id: '1' }]);
    });

    test('renders dates as strings after a round trip', () => {
        expect(roundTrip({ name: 'x', when: new Date(Date.UTC(2020, 0, 1)) }).when).toBe(
            '2020-01-01T00:00:00Z',
        );
    });

    test('does not surface const fields as input keys', () => {
        expect(Object.keys(roundTrip({ name: 'x' }))).not.toContain('schema_id');
    });

    test('reports an unknown element', () => {
        const issues: Issue[] = [];
        parseNode(TOY, parseXml('<toy><name>x</name><mystery>1</mystery></toy>'), {
            path: '',
            issues,
            onUnknownElement: 'error',
        });
        expect(issues[0]).toMatchObject({ code: 'unknownElement' });
    });

    test('ignores an unknown element when asked', () => {
        const issues: Issue[] = [];
        parseNode(
            TOY,
            parseXml('<toy><schema_id>toy_v1</schema_id><name>x</name><mystery>1</mystery></toy>'),
            { path: '', issues, onUnknownElement: 'ignore' },
        );
        expect(issues).toHaveLength(0);
    });
});

describe('parseNode validates while it consumes', () => {
    const parse = (xml: string) => {
        const issues: Issue[] = [];
        const value = parseNode(TOY, parseXml(xml), {
            path: '',
            issues,
            onUnknownElement: 'error',
        });
        return { value, issues };
    };

    test('reports a missing required element', () => {
        expect(parse('<toy><schema_id>toy_v1</schema_id></toy>').issues).toContainEqual(
            expect.objectContaining({ path: 'name', code: 'required' }),
        );
    });

    test('reports a wrong fixed value', () => {
        // This is what rejects a v3.2 document.
        expect(
            parse('<toy><schema_id>toy_v0</schema_id><name>x</name></toy>').issues[0],
        ).toMatchObject({
            code: 'enum',
        });
    });

    test('reports a duplicated singleton', () => {
        expect(
            parse('<toy><schema_id>toy_v1</schema_id><name>a</name><name>b</name></toy>').issues[0],
        ).toMatchObject({ path: 'name', code: 'cardinality' });
    });

    test('reports children out of sequence order', () => {
        expect(
            parse('<toy><name>x</name><schema_id>toy_v1</schema_id></toy>').issues.map(
                (i) => i.code,
            ),
        ).toContain('cardinality');
    });

    test('reports a non-numeric value in an integer element', () => {
        expect(
            parse('<toy><schema_id>toy_v1</schema_id><name>x</name><count>abc</count></toy>')
                .issues[0],
        ).toMatchObject({ path: 'count', code: 'type' });
    });

    test('a well-formed, in-order document yields no issues', () => {
        expect(
            parse('<toy><schema_id>toy_v1</schema_id><name>x</name><count>5</count></toy>').issues,
        ).toEqual([]);
    });
});
