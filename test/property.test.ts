import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { buildRelease, parseRelease, validateRelease } from '../src/api';
import type { ReleaseInput } from '../src/model';
import { expectValidAgainstXsd } from './helpers/xsd';

/** Text that is safe for XML: no control characters, no lone surrogates. */
// biome-ignore lint/suspicious/noControlCharactersInRegex: the point of this pattern is to reject XML-illegal control characters
const ILLEGAL_XML_CHAR = /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u;

const xmlSafeString = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => !ILLEGAL_XML_CHAR.test(s))
    .filter((s) => s.trim().length > 0);

const countryCode = fc.constantFrom('WW', 'US', 'CA', 'GB', 'JP', 'DE', 'AQ');

const isrc = fc
    .tuple(
        fc.stringMatching(/^[A-Z0-9]{5}$/),
        fc.stringMatching(/^[0-9]{2}$/),
        fc.stringMatching(/^[A-Z0-9]{5}$/),
    )
    .map(([a, b, c]) => `${a}${b}${c}`);

const attrArb = fc.record({ key: xmlSafeString, value: xmlSafeString });

const participantArb = fc.record(
    {
        role: fc.constantFrom('Main Artist', 'Producer', 'Song Writer'),
        name: xmlSafeString,
        primary: fc.boolean(),
        artistID: fc.array(fc.record({ type: xmlSafeString, id: xmlSafeString }), { maxLength: 2 }),
    },
    { requiredKeys: ['role', 'name'] },
);

/** Both accepted date forms, so the build/parse normalization is exercised. */
const dateOnlyArb = fc.oneof(
    fc.date({
        min: new Date('1970-01-01T00:00:00Z'),
        max: new Date('2200-01-01T00:00:00Z'),
        noInvalidDate: true,
    }),
    fc.stringMatching(/^20[0-2][0-9]-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-8])$/),
);
const dateTimeArb = fc.oneof(
    fc.date({
        min: new Date('1970-01-01T00:00:00Z'),
        max: new Date('2200-01-01T00:00:00Z'),
        noInvalidDate: true,
    }),
    fc.stringMatching(
        /^20[0-2][0-9]-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-8])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/,
    ),
);
const partialDateArb = fc.oneof(
    dateOnlyArb,
    fc.stringMatching(/^20[0-2][0-9]$/),
    fc.stringMatching(/^20[0-2][0-9]-(0[1-9]|1[0-2])$/),
);

const assetArb = fc.record(
    {
        type: fc.constantFrom('audio', 'image', 'asset'),
        fileName: xmlSafeString,
        subtype: xmlSafeString,
        notes: xmlSafeString,
        format: xmlSafeString,
        mimeType: fc.constantFrom('audio/flac', 'image/jpeg', 'application/pdf'),
        md5Checksum: fc.stringMatching(/^[0-9a-f]{32}$/),
        attr: fc.array(attrArb, { maxLength: 2 }),
    },
    { requiredKeys: ['type', 'fileName'] },
);

const permissionArb = fc.record(
    {
        type: fc.array(fc.constantFrom('stream', 'download', 'preorder', 'subscription'), {
            minLength: 1,
            maxLength: 3,
        }),
        enabled: fc.boolean(),
        startDate: dateTimeArb,
        endDate: dateTimeArb,
        attr: fc.array(attrArb, { maxLength: 2 }),
        countryCode: fc.array(countryCode, { maxLength: 3 }),
    },
    { requiredKeys: ['type', 'enabled'] },
);

const territoryArb = fc.record(
    {
        countryCode: fc.array(countryCode, { minLength: 1, maxLength: 3 }),
        releaseDate: dateTimeArb,
        permissions: fc.array(permissionArb, { maxLength: 2 }),
    },
    { requiredKeys: ['countryCode'] },
);

const trackArb = fc.record(
    {
        trackNumber: fc.integer({ min: 1, max: 99 }),
        assets: fc.array(assetArb, { maxLength: 2 }),
        permissions: fc.array(permissionArb, { maxLength: 2 }),
        territories: fc.array(territoryArb, { maxLength: 2 }),
        title: xmlSafeString,
        displayArtist: xmlSafeString,
        discNumber: fc.integer({ min: 1, max: 5 }),
        trackLength: fc.integer({ min: 0, max: 7200 }),
        bpm: fc.integer({ min: 0, max: 300 }),
        previewStart: fc.integer({ min: 0, max: 600 }),
        isrc,
        advisory: fc.constantFrom('none', 'clean', 'explicit'),
        tags: fc.array(xmlSafeString, { maxLength: 3 }),
        texts: fc.array(fc.record({ content: xmlSafeString }), { maxLength: 2 }),
        participants: fc.array(participantArb, { maxLength: 3 }),
        attr: fc.array(attrArb, { maxLength: 2 }),
    },
    { requiredKeys: ['trackNumber', 'title', 'displayArtist'] },
);

const releaseArb: fc.Arbitrary<ReleaseInput> = fc.record(
    {
        action: fc.constantFrom('add', 'update', 'full-update', 'meta-update', 'delete'),
        title: xmlSafeString,
        displayArtist: xmlSafeString,
        tracks: fc.array(trackArb, { minLength: 1, maxLength: 4 }),
        distributorName: xmlSafeString,
        upc: fc.stringMatching(/^[0-9]{12,14}$/),
        compilation: fc.boolean(),
        exportTime: dateTimeArb,
        releaseDate: dateOnlyArb,
        originalReleaseDate: partialDateArb,
        globalReleaseDate: dateTimeArb,
        assets: fc.array(assetArb, { maxLength: 2 }),
        releaseFormat: fc.constantFrom('single', 'album', 'ep', 'dj mix'),
        recordingLocation: countryCode,
        cYear: fc.integer({ min: 1000, max: 9999 }),
        genres: fc.array(fc.record({ primary: xmlSafeString }), { maxLength: 2 }),
        tags: fc.array(xmlSafeString, { maxLength: 3 }),
        label: fc.record({ name: xmlSafeString }),
        territories: fc.array(territoryArb, { maxLength: 2 }),
        permissions: fc.array(permissionArb, { maxLength: 2 }),
        attr: fc.array(attrArb, { maxLength: 2 }),
    },
    { requiredKeys: ['action', 'title', 'displayArtist', 'tracks'] },
);

describe('properties', () => {
    test('every generated release validates', () => {
        fc.assert(
            fc.property(releaseArb, (input) => {
                expect(validateRelease(input)).toEqual([]);
            }),
            { numRuns: 300 },
        );
    });

    test('build is a fixed point of parse', () => {
        fc.assert(
            fc.property(releaseArb, (input) => {
                const once = buildRelease(input);
                expect(buildRelease(parseRelease(once))).toBe(once);
            }),
            { numRuns: 300 },
        );
    });

    test('generated documents satisfy the XSD', async () => {
        await fc.assert(
            fc.asyncProperty(releaseArb, async (input) => {
                await expectValidAgainstXsd(buildRelease(input));
            }),
            { numRuns: 40 },
        );
    });
});

describe('parser robustness', () => {
    test('arbitrary input either parses or throws an Error, never hangs', () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 200 }), (s) => {
                try {
                    parseRelease(s);
                } catch (e) {
                    expect(e).toBeInstanceOf(Error);
                }
            }),
            { numRuns: 500 },
        );
    });

    // The property above passes whenever parsing merely succeeds, so it cannot
    // detect a parser that accepts everything. These mutations must be rejected.
    test('mutating a valid document into an invalid one is always rejected', () => {
        fc.assert(
            fc.property(
                releaseArb,
                fc.constantFrom<(x: string) => string>(
                    (x) => x.replace('</release>', ''),
                    (x) => x.replace('<title>', '<title'),
                    (x) => x.replace('audiosalad_release_v3.4', 'audiosalad_export_v3.2'),
                    (x) => `${x}<trailing/>`,
                ),
                (input, mutate) => {
                    expect(() => parseRelease(mutate(buildRelease(input)))).toThrow();
                },
            ),
            { numRuns: 100 },
        );
    });
});
