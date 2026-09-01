import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import type { ReleaseInput } from '../../src/model';
import { RELEASE, TRACK } from '../../src/spec/v3_4';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'T',
    displayArtist: 'A',
    tracks: [{ trackNumber: 1, title: 'One', displayArtist: 'A' }],
};

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

describe('TRACK', () => {
    test('requires track_number, title, and display_artist', () => {
        expect(render(TRACK, {} as never, 'track').issues.map((i) => i.path)).toEqual([
            'trackNumber',
            'title',
            'displayArtist',
        ]);
    });

    // DEFECT 4 regression: `previewStart: 0` was dropped by a falsy guard.
    test('emits preview_start when it is zero', () => {
        const { xml } = render(
            TRACK,
            {
                trackNumber: 1,
                title: 'T',
                displayArtist: 'A',
                previewStart: 0,
                previewDuration: 30,
            },
            'track',
        );
        expect(xml).toContain('<preview_start>0</preview_start>');
    });

    test('validates ISRC and ISWC', () => {
        const bad = render(
            TRACK,
            { trackNumber: 1, title: 'T', displayArtist: 'A', isrc: 'NOPE', iswc: '123' },
            'track',
        );
        expect(bad.issues.map((i) => i.path)).toContain('isrc');
        expect(bad.issues.map((i) => i.path)).toContain('iswc');

        const good = render(
            TRACK,
            {
                trackNumber: 1,
                title: 'T',
                displayArtist: 'A',
                isrc: 'QM7G92017457',
                iswc: 'T1234567890',
            },
            'track',
        );
        expect(good.issues).toHaveLength(0);
    });

    test('emits all 29 elements in XSD sequence order', () => {
        const { xml } = render(
            TRACK,
            {
                vendorTrackID: 'v',
                isrc: 'QM7G92017457',
                iswc: 'T1234567890',
                discNumber: 1,
                trackNumber: 1,
                title: 'T',
                titleVersion: 'tv',
                work: 'w',
                trackLength: 181,
                advisory: 'explicit',
                audioLanguage: 'English',
                bpm: 120,
                previewStart: 30,
                previewDuration: 30,
                displayArtist: 'A',
                participants: [{ role: 'Main Artist', name: 'A' }],
                genres: [{ primary: 'Pop' }],
                tags: ['t'],
                notes: 'n',
                texts: [{ content: 'c' }],
                cInfo: 'ci',
                cYear: 2020,
                pInfo: 'pi',
                pYear: 2020,
                rightsHolders: 'rh',
                priceTiers: [{ type: 'iTunes', name: 'Mid' }],
                permissions: [{ type: ['stream'], enabled: true }],
                territories: [{ countryCode: ['WW'] }],
                assets: [{ type: 'audio', fileName: 'a.wav' }],
                attr: [{ key: 'k', value: 'v' }],
            },
            'track',
        );
        const order = [
            'vendor_track_id',
            'isrc',
            'iswc',
            'disc_number',
            'track_number',
            'title',
            'title_version',
            'work',
            'track_length',
            'advisory',
            'audio_language',
            'bpm',
            'preview_start',
            'preview_duration',
            'display_artist',
            'participant',
            'genre',
            'tag',
            'notes',
            'text',
            'c_info',
            'c_year',
            'p_info',
            'p_year',
            'rights_holders',
            'price_tier',
            'permission',
            'territory',
            'asset',
            'attr',
        ];
        const positions = order.map((e) => {
            const at = xml.indexOf(`<${e}>`);
            expect(at).toBeGreaterThan(-1);
            return at;
        });
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});

describe('RELEASE', () => {
    test('accepts a minimal release', () => {
        expect(render(RELEASE, minimal, 'release').issues).toHaveLength(0);
    });

    test('emits the v3.4 schema_id without reading input', () => {
        expect(render(RELEASE, minimal, 'release').xml).toContain(
            '<schema_id>audiosalad_release_v3.4</schema_id>',
        );
    });

    test('schema_id is the first child', () => {
        const { xml } = render(RELEASE, minimal, 'release');
        expect(xml.indexOf('<schema_id>')).toBeLessThan(xml.indexOf('<action>'));
    });

    test('requires at least one track', () => {
        const { issues } = render(RELEASE, { ...minimal, tracks: [] }, 'release');
        expect(issues[0]).toMatchObject({ path: 'tracks', code: 'required' });
    });

    test('requires action, title, and display_artist', () => {
        const { issues } = render(RELEASE, { tracks: minimal.tracks } as never, 'release');
        expect(issues.map((i) => i.path)).toEqual(['action', 'title', 'displayArtist']);
    });

    test('validates action against action_type', () => {
        expect(
            render(RELEASE, { ...minimal, action: 'destroy' }, 'release').issues.map((i) => i.code),
        ).toContain('enum');
    });

    test('validates upc_ean length and digits', () => {
        expect(
            render(RELEASE, { ...minimal, upc: '123' }, 'release').issues.map((i) => i.code),
        ).toContain('minLength');
        // v3.4 widened the maximum to 14.
        expect(
            render(RELEASE, { ...minimal, upc: '12345678901234' }, 'release').issues,
        ).toHaveLength(0);
    });

    test('emits an original_release_date that is only a year', () => {
        expect(
            render(RELEASE, { ...minimal, originalReleaseDate: '2019' }, 'release').xml,
        ).toContain('<original_release_date>2019</original_release_date>');
    });

    test('emits compilation when it is false', () => {
        expect(render(RELEASE, { ...minimal, compilation: false }, 'release').xml).toContain(
            '<compilation>false</compilation>',
        );
    });

    test('has no dsp_delivery field — removed in v3.4', () => {
        expect(RELEASE.fields.some((f) => f.el === 'dsp_delivery')).toBe(false);
    });

    test('emits all 40 elements in XSD sequence order', () => {
        const { xml } = render(
            RELEASE,
            {
                ...minimal,
                distributorName: 'd',
                exportID: 'e',
                exportTime: '2020-05-02T00:00:00Z',
                upc: '123456789012',
                vendorReleaseID: 'vr',
                globalReleaseID: 'gr',
                catalogID: 'c',
                series: 's',
                titleVersion: 'tv',
                advisory: 'explicit',
                metadataLanguage: 'English',
                audioLanguage: 'English',
                participants: [{ role: 'Main Artist', name: 'A' }],
                compilation: false,
                originalReleaseDate: '2020-05-02',
                releaseDate: '2020-05-02',
                releaseFormat: 'single',
                recordingLocation: 'US',
                url: 'https://x.test',
                genres: [{ primary: 'Pop' }],
                tags: ['t'],
                notes: 'n',
                texts: [{ content: 'c' }],
                cInfo: 'ci',
                cYear: 2020,
                pInfo: 'pi',
                pYear: 2020,
                rightsHolders: 'rh',
                label: { name: 'L' },
                priceTiers: [{ type: 'iTunes', name: 'Mid' }],
                permissions: [{ type: ['preorder'], enabled: true }],
                globalReleaseDate: '2020-05-02T21:00:00Z',
                territories: [{ countryCode: ['WW'] }],
                assets: [{ type: 'image', fileName: 'c.jpg' }],
                attr: [{ key: 'k', value: 'v' }],
            },
            'release',
        );
        const order = [
            'schema_id',
            'distributor_name',
            'export_id',
            'export_time',
            'action',
            'upc_ean',
            'vendor_release_id',
            'global_release_id',
            'catalog_id',
            'series',
            'title',
            'title_version',
            'advisory',
            'metadata_language',
            'audio_language',
            'display_artist',
            'participant',
            'compilation',
            'original_release_date',
            'release_date',
            'release_format',
            'recording_location',
            'url',
            'genre',
            'tag',
            'notes',
            'text',
            'c_info',
            'c_year',
            'p_info',
            'p_year',
            'rights_holders',
            'label',
            'price_tier',
            'permission',
            'global_release_date',
            'territory',
            'asset',
            'track',
            'attr',
        ];
        const positions = order.map((e) => {
            const at = xml.indexOf(`<${e}>`);
            expect(at).toBeGreaterThan(-1);
            return at;
        });
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});
