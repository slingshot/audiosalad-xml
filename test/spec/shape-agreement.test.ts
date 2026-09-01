import { describe, expect, test } from 'bun:test';
import type { ComplexType } from '../../src/core/descriptor';
import {
    ASSET,
    ATTR,
    GENRE,
    LABEL,
    PARTICIPANT,
    PERMISSION,
    PRICE_TIER,
    PROPRIETARY_ID,
    RELEASE,
    TERRITORY,
    TEXT,
    TRACK,
} from '../../src/spec/v3_4';

/**
 * The input keys each table reads. Kept as a literal list rather than derived,
 * so that adding a descriptor without updating the model — or the reverse —
 * shows up here as a diff a reviewer must approve.
 */
const EXPECTED: ReadonlyArray<[string, ComplexType<never>, readonly string[]]> = [
    ['ATTR', ATTR as ComplexType<never>, ['type', 'key', 'value']],
    ['PROPRIETARY_ID', PROPRIETARY_ID as ComplexType<never>, ['type', 'id']],
    ['GENRE', GENRE as ComplexType<never>, ['primary', 'sub']],
    ['PRICE_TIER', PRICE_TIER as ComplexType<never>, ['type', 'name']],
    ['TEXT', TEXT as ComplexType<never>, ['type', 'language', 'content']],
    [
        'LABEL',
        LABEL as ComplexType<never>,
        ['vendorLabelID', 'name', 'city', 'state', 'country', 'url', 'notes'],
    ],
    [
        'PARTICIPANT',
        PARTICIPANT as ComplexType<never>,
        ['role', 'roleType', 'instrument', 'name', 'primary', 'artistID'],
    ],
    [
        'ASSET',
        ASSET as ComplexType<never>,
        [
            'type',
            'subtype',
            'name',
            'notes',
            'format',
            'mimeType',
            'md5Checksum',
            'fileName',
            'attr',
        ],
    ],
    [
        'PERMISSION',
        PERMISSION as ComplexType<never>,
        ['type', 'enabled', 'startDate', 'endDate', 'attr', 'countryCode'],
    ],
    ['TERRITORY', TERRITORY as ComplexType<never>, ['countryCode', 'releaseDate', 'permissions']],
    [
        'TRACK',
        TRACK as ComplexType<never>,
        [
            'vendorTrackID',
            'isrc',
            'iswc',
            'discNumber',
            'trackNumber',
            'title',
            'titleVersion',
            'work',
            'trackLength',
            'advisory',
            'audioLanguage',
            'bpm',
            'previewStart',
            'previewDuration',
            'displayArtist',
            'participants',
            'genres',
            'tags',
            'notes',
            'texts',
            'cInfo',
            'cYear',
            'pInfo',
            'pYear',
            'rightsHolders',
            'priceTiers',
            'permissions',
            'territories',
            'assets',
            'attr',
        ],
    ],
    [
        'RELEASE',
        RELEASE as ComplexType<never>,
        [
            'distributorName',
            'exportID',
            'exportTime',
            'action',
            'upc',
            'vendorReleaseID',
            'globalReleaseID',
            'catalogID',
            'series',
            'title',
            'titleVersion',
            'advisory',
            'metadataLanguage',
            'audioLanguage',
            'displayArtist',
            'participants',
            'compilation',
            'originalReleaseDate',
            'releaseDate',
            'releaseFormat',
            'recordingLocation',
            'url',
            'genres',
            'tags',
            'notes',
            'texts',
            'cInfo',
            'cYear',
            'pInfo',
            'pYear',
            'rightsHolders',
            'label',
            'priceTiers',
            'permissions',
            'globalReleaseDate',
            'territories',
            'assets',
            'tracks',
            'attr',
        ],
    ],
];

describe('descriptor tables and input interfaces agree', () => {
    for (const [name, type, expected] of EXPECTED) {
        test(`${name} reads exactly the documented input keys`, () => {
            const keys = type.fields.filter((f) => f.const === undefined).map((f) => f.key);
            expect(keys).toEqual(expected as string[]);
        });

        test(`${name} gives every non-const field a key`, () => {
            for (const f of type.fields) {
                if (f.const === undefined) expect(f.key).toBeDefined();
            }
        });

        // Six of the twelve tables have no complex fields, so a bare loop with
        // the expect inside an `if` reported green while asserting nothing.
        const complexFields = type.fields.filter((f) => f.kind === 'complex');
        if (complexFields.length > 0) {
            test(`${name} declares a complex type for each of its ${complexFields.length} complex field(s)`, () => {
                for (const f of complexFields) expect(f.type).toBeDefined();
            });
        }
    }

    test('no table has duplicate element names', () => {
        for (const [name, type] of EXPECTED) {
            const els = type.fields.map((f) => f.el);
            expect(new Set(els).size, `${name} has a duplicate element name`).toBe(els.length);
        }
    });
});
