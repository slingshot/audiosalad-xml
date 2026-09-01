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
