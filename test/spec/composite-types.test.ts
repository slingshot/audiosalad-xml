import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import { ASSET, PARTICIPANT, PERMISSION, TERRITORY } from '../../src/spec/v3_4';

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

describe('PARTICIPANT', () => {
    // DEFECT 1 regression: 0.1.x used `artistID?.forEach(...)`, so artist_id
    // never reached the output.
    test('emits every artist_id', () => {
        const { xml, issues } = render(
            PARTICIPANT,
            {
                role: 'Main Artist',
                name: 'Billie Eilish',
                primary: true,
                artistID: [
                    { type: 'spotify', id: 'sp1' },
                    { type: 'apple', id: 'ap1' },
                ],
            },
            'participant',
        );
        expect(issues).toHaveLength(0);
        expect(xml.match(/<artist_id>/g)).toHaveLength(2);
        expect(xml).toContain('<id>sp1</id>');
        expect(xml).toContain('<id>ap1</id>');
    });

    test('emits fields in XSD order', () => {
        const { xml } = render(
            PARTICIPANT,
            {
                role: 'Producer',
                roleType: 'Executive Producer',
                instrument: 'Guitar',
                name: 'X',
                primary: false,
            },
            'participant',
        );
        const order = ['role', 'role_type', 'instrument', 'name', 'primary'];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    test('requires role and name', () => {
        expect(render(PARTICIPANT, {}, 'participant').issues.map((i) => i.path)).toEqual([
            'role',
            'name',
        ]);
    });

    test('omits primary when absent, emits it when false', () => {
        expect(render(PARTICIPANT, { role: 'r', name: 'n' }, 'participant').xml).not.toContain(
            '<primary>',
        );
        expect(
            render(PARTICIPANT, { role: 'r', name: 'n', primary: false }, 'participant').xml,
        ).toContain('<primary>false</primary>');
    });
});

describe('ASSET', () => {
    // DEFECT 2 regression: 0.1.x used `attr?.forEach(...)`.
    test('emits every attr', () => {
        const { xml } = render(
            ASSET,
            {
                type: 'audio',
                fileName: 'a.wav',
                attr: [
                    { key: 'k1', value: 'v1' },
                    { key: 'k2', value: 'v2' },
                ],
            },
            'asset',
        );
        expect(xml.match(/<attr>/g)).toHaveLength(2);
    });

    // v3.4 made md5_checksum optional.
    test('accepts an asset with no checksum', () => {
        const { issues, xml } = render(ASSET, { type: 'image', fileName: 'c.jpg' }, 'asset');
        expect(issues).toHaveLength(0);
        expect(xml).not.toContain('<md5_checksum>');
    });

    test('requires type and file_name', () => {
        expect(render(ASSET, {}, 'asset').issues.map((i) => i.path)).toEqual(['type', 'fileName']);
    });

    test('emits fields in XSD order', () => {
        const { xml } = render(
            ASSET,
            {
                type: 'audio',
                subtype: 'wav',
                name: 'n',
                notes: 'no',
                format: 'wav',
                mimeType: 'audio/wav',
                md5Checksum: 'abc',
                fileName: 'f.wav',
            },
            'asset',
        );
        const order = [
            'type',
            'sub_type',
            'name',
            'notes',
            'format',
            'mime_type',
            'md5_checksum',
            'file_name',
        ];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});

describe('PERMISSION', () => {
    // v3.4 made permission/type unbounded.
    test('emits multiple type elements', () => {
        const { xml, issues } = render(
            PERMISSION,
            { type: ['stream', 'download'], enabled: true },
            'permission',
        );
        expect(issues).toHaveLength(0);
        expect(xml.match(/<type>/g)).toHaveLength(2);
    });

    test('requires at least one type and an explicit enabled', () => {
        const { issues } = render(PERMISSION, { type: [] }, 'permission');
        expect(issues.map((i) => i.code)).toEqual(['required', 'required']);
    });

    // v3.4 added attr, between end_date and country_code.
    test('emits attr before country_code', () => {
        const { xml } = render(
            PERMISSION,
            {
                type: ['preorder'],
                enabled: true,
                startDate: '2021-01-01T00:00:00Z',
                endDate: '2021-12-31T00:00:00Z',
                attr: [{ key: 'k', value: 'v' }],
                countryCode: ['US'],
            },
            'permission',
        );
        expect(xml.indexOf('<attr>')).toBeLessThan(xml.indexOf('<country_code>'));
        expect(xml.indexOf('<end_date>')).toBeLessThan(xml.indexOf('<attr>'));
    });

    test('rejects a three-letter country code', () => {
        const { issues } = render(
            PERMISSION,
            { type: ['stream'], enabled: true, countryCode: ['USA'] },
            'permission',
        );
        expect(issues[0]).toMatchObject({ path: 'countryCode[0]', code: 'pattern' });
    });
});

describe('TERRITORY', () => {
    // DEFECT 3 regression: 0.1.x used `permissions?.forEach(...)`.
    test('emits every permission', () => {
        const { xml } = render(
            TERRITORY,
            {
                countryCode: ['WW'],
                permissions: [
                    { type: ['stream'], enabled: true },
                    { type: ['download'], enabled: false },
                ],
            },
            'territory',
        );
        expect(xml.match(/<permission>/g)).toHaveLength(2);
    });

    test('requires at least one country_code', () => {
        expect(render(TERRITORY, {}, 'territory').issues[0]).toMatchObject({
            path: 'countryCode',
            code: 'required',
        });
    });

    test('emits multiple country codes then release_date', () => {
        const { xml } = render(
            TERRITORY,
            { countryCode: ['US', 'CA'], releaseDate: '2020-05-02T00:00:00Z' },
            'territory',
        );
        expect(xml.match(/<country_code>/g)).toHaveLength(2);
        expect(xml.indexOf('<country_code>')).toBeLessThan(xml.indexOf('<release_date>'));
    });
});
