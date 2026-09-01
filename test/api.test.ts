import { describe, expect, test } from 'bun:test';
import { AudioSaladValidationError, buildRelease, parseRelease, validateRelease } from '../src/api';
import type { ReleaseInput } from '../src/model';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'Everything I Wanted',
    displayArtist: 'Billie Eilish',
    tracks: [{ trackNumber: 1, title: 'Everything I Wanted', displayArtist: 'Billie Eilish' }],
};

describe('buildRelease', () => {
    test('emits an XML declaration and the v3.4 namespace', () => {
        const xml = buildRelease(minimal);
        expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>\n');
        expect(xml).toContain('<release xmlns="audiosalad_release_v3.4"');
        expect(xml).toContain('xsi:schemaLocation="audiosalad_release_v3.4 https://');
    });

    test('omits the declaration on request', () => {
        expect(buildRelease(minimal, { xmlDeclaration: false })).toStartWith('<release');
    });

    test('throws AudioSaladValidationError carrying every issue', () => {
        let caught: unknown;
        try {
            buildRelease({ tracks: [] } as never);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(AudioSaladValidationError);
        const issues = (caught as AudioSaladValidationError).issues;
        expect(issues.map((i) => i.path)).toEqual(['action', 'title', 'displayArtist', 'tracks']);
    });

    test('the error message names the first few problems', () => {
        expect(() => buildRelease({ tracks: [] } as never)).toThrow(/action: .*required/);
    });

    test('skips validation when asked', () => {
        expect(() => buildRelease({ ...minimal, upc: 'nope' }, { validate: false })).not.toThrow();
    });
});

describe('validateRelease', () => {
    test('returns an empty array for a valid release', () => {
        expect(validateRelease(minimal)).toEqual([]);
    });

    test('never throws', () => {
        expect(() => validateRelease({} as never)).not.toThrow();
        expect(validateRelease({} as never).length).toBeGreaterThan(0);
    });

    test('paths point into the input, not the XML', () => {
        const issues = validateRelease({
            ...minimal,
            tracks: [{ trackNumber: 1, title: 't', displayArtist: 'a', isrc: 'BAD' }],
        });
        expect(issues[0]?.path).toBe('tracks[0].isrc');
    });
});

describe('parseRelease', () => {
    test('round-trips through build', () => {
        expect(buildRelease(parseRelease(buildRelease(minimal)))).toBe(buildRelease(minimal));
    });

    test('recovers nested structure', () => {
        const input: ReleaseInput = {
            ...minimal,
            label: { name: 'Slingshot Records', url: 'https://x.test' },
            tracks: [
                {
                    trackNumber: 1,
                    title: 'T',
                    displayArtist: 'A',
                    previewStart: 0,
                    participants: [
                        {
                            role: 'Main Artist',
                            name: 'A',
                            primary: true,
                            artistID: [{ type: 'spotify', id: 's1' }],
                        },
                    ],
                },
            ],
        };
        const out = parseRelease(buildRelease(input));
        expect(out.label).toEqual({ name: 'Slingshot Records', url: 'https://x.test' });
        expect(out.tracks[0]?.previewStart).toBe(0);
        expect(out.tracks[0]?.participants?.[0]?.artistID).toEqual([{ type: 'spotify', id: 's1' }]);
    });

    test('throws SyntaxError on malformed XML', () => {
        expect(() => parseRelease('<release><track></release>')).toThrow(SyntaxError);
    });

    test('throws on an unknown element by default', () => {
        const xml = buildRelease(minimal).replace('</release>', '<mystery>1</mystery></release>');
        expect(() => parseRelease(xml)).toThrow(AudioSaladValidationError);
    });

    test('ignores unknown elements on request', () => {
        const xml = buildRelease(minimal).replace('</release>', '<mystery>1</mystery></release>');
        expect(parseRelease(xml, { onUnknownElement: 'ignore' }).title).toBe('Everything I Wanted');
    });

    test('rejects a v3.2 document', () => {
        const v32 = buildRelease(minimal).replaceAll(
            'audiosalad_release_v3.4',
            'audiosalad_export_v3.2',
        );
        expect(() => parseRelease(v32)).toThrow(AudioSaladValidationError);
    });

    test('rejects a duplicated singleton element', () => {
        const xml = buildRelease(minimal).replace(
            '<title>Everything I Wanted</title>',
            '<title>Everything I Wanted</title>\n    <title>Duplicate</title>',
        );
        expect(() => parseRelease(xml)).toThrow(AudioSaladValidationError);
    });

    test('rejects a non-numeric track_number', () => {
        const xml = buildRelease(minimal).replace(
            '<track_number>1</track_number>',
            '<track_number>abc</track_number>',
        );
        expect(() => parseRelease(xml)).toThrow(AudioSaladValidationError);
    });

    test('rejects a release with no tracks', () => {
        expect(() =>
            parseRelease(
                '<release xmlns="audiosalad_release_v3.4"><schema_id>audiosalad_release_v3.4</schema_id>' +
                    '<action>add</action><title>t</title><display_artist>a</display_artist></release>',
            ),
        ).toThrow(AudioSaladValidationError);
    });
});

describe('parseRelease enforces facets, not just structure', () => {
    // Facets were declared on the descriptor tables but applied only when
    // building, so parseRelease accepted documents the XSD rejects — and the
    // API contradicted itself: parse succeeded, then build on its own output
    // threw. Golden round-trips cannot catch this, since they only ever parse
    // XML that buildRelease already validated.
    const withTrackChild = (el: string, text: string): string =>
        buildRelease(minimal).replace(
            '<track_number>1</track_number>',
            `<${el}>${text}</${el}>\n        <track_number>1</track_number>`,
        );

    // Insertion points must respect XSD sequence order, or parseRelease rejects
    // the document for being out of order and the test passes without ever
    // exercising the facet it names.
    const afterAction = (el: string, text: string): string =>
        buildRelease(minimal).replace(
            '<action>add</action>',
            `<action>add</action>\n    <${el}>${text}</${el}>`,
        );

    const beforeTrack = (el: string, text: string): string =>
        buildRelease(minimal).replace('<track>', `<${el}>${text}</${el}>\n    <track>`);

    test('the insertion helpers produce structurally valid documents', () => {
        // Otherwise every test below would pass on an ordering error instead of
        // the facet violation it claims to test.
        expect(() => parseRelease(afterAction('upc_ean', '123456789012'))).not.toThrow();
        expect(() => parseRelease(beforeTrack('recording_location', 'US'))).not.toThrow();
        expect(() => parseRelease(beforeTrack('release_format', 'single'))).not.toThrow();
        expect(() => parseRelease(beforeTrack('c_year', '2020'))).not.toThrow();
        expect(() => parseRelease(withTrackChild('isrc', 'QM7G92017457'))).not.toThrow();
    });

    test('rejects an ISRC that violates its pattern', () => {
        expect(() => parseRelease(withTrackChild('isrc', 'NOT-AN-ISRC'))).toThrow(
            AudioSaladValidationError,
        );
    });

    test('rejects an action outside the enumeration', () => {
        const xml = buildRelease(minimal).replace(
            '<action>add</action>',
            '<action>frobnicate</action>',
        );
        expect(() => parseRelease(xml)).toThrow(AudioSaladValidationError);
    });

    test('rejects a non-numeric upc_ean', () => {
        expect(() => parseRelease(afterAction('upc_ean', 'ABCDEFGHIJKL'))).toThrow(
            AudioSaladValidationError,
        );
    });

    test('rejects a three-letter recording_location', () => {
        expect(() => parseRelease(beforeTrack('recording_location', 'USA'))).toThrow(
            AudioSaladValidationError,
        );
    });

    test('rejects a release_format outside the enumeration', () => {
        expect(() => parseRelease(beforeTrack('release_format', 'Mixtape'))).toThrow(
            AudioSaladValidationError,
        );
    });

    test('rejects a c_year that is not a four-digit year', () => {
        // Previously returned the raw string, so ReleaseInput.cYear — typed
        // `number` — came back holding "not-a-year".
        expect(() => parseRelease(beforeTrack('c_year', 'not-a-year'))).toThrow(
            AudioSaladValidationError,
        );
    });

    test('what parseRelease accepts, buildRelease can always re-emit', () => {
        // The self-consistency property the missing facet checks broke.
        const xml = buildRelease(minimal);
        expect(() => buildRelease(parseRelease(xml))).not.toThrow();
    });
});
