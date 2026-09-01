import { SAMPLE_RELEASE } from '../src/legacy/sample';
import type { ReleaseInput } from '../src/model';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'Minimal',
    displayArtist: 'Nobody',
    tracks: [{ trackNumber: 1, title: 'Only Track', displayArtist: 'Nobody' }],
};

const unicode: ReleaseInput = {
    action: 'update',
    title: '勝訴ストリップ',
    displayArtist: '椎名林檎',
    metadataLanguage: 'Japanese',
    notes: 'Emoji \u{1F3B5}, accents é, quote "x" & ampersand <tag>',
    texts: [
        { type: 'Liner Notes', language: 'Japanese', content: 'line one\nline two\n\tindented' },
    ],
    tracks: [
        {
            trackNumber: 1,
            title: '正しい街',
            displayArtist: '椎名林檎',
            texts: [{ type: 'Lyrics', content: 'It\'s <b>bold</b> & "quoted"' }],
        },
    ],
};

const multiDisc: ReleaseInput = {
    action: 'add',
    title: 'Two Discs',
    displayArtist: 'Someone',
    releaseFormat: 'double album',
    upc: '12345678901234',
    tracks: [
        { discNumber: 1, trackNumber: 1, title: 'A1', displayArtist: 'Someone', previewStart: 0 },
        { discNumber: 1, trackNumber: 2, title: 'A2', displayArtist: 'Someone' },
        { discNumber: 2, trackNumber: 1, title: 'B1', displayArtist: 'Someone' },
    ],
};

const multiTerritory: ReleaseInput = {
    action: 'full-update',
    title: 'Wide Release',
    displayArtist: 'Someone',
    permissions: [{ type: ['preorder'], enabled: true, countryCode: ['US', 'CA'] }],
    territories: [
        { countryCode: ['US', 'CA'], releaseDate: '2020-05-02T00:00:00Z' },
        {
            countryCode: ['JP'],
            releaseDate: '2020-05-09T00:00:00Z',
            permissions: [{ type: ['stream', 'download'], enabled: true }],
        },
    ],
    tracks: [{ trackNumber: 1, title: 'T', displayArtist: 'Someone' }],
};

/**
 * Mirrors the date shapes in AudioSalad's own published sample export: a zoned
 * `export_time`, a date-only release_date, and UNZONED dateTimes on
 * permission/start_date and territory/release_date.
 */
const audiosaladDateShapes: ReleaseInput = {
    action: 'add',
    title: 'Unzoned Dates',
    displayArtist: 'Someone',
    exportTime: '2024-02-20T16:32:12Z',
    releaseDate: '2019-08-01',
    originalReleaseDate: '2019-08-01',
    cYear: 2014,
    pYear: 2014,
    permissions: [{ type: ['preorder'], enabled: true, startDate: '2019-07-19T00:00:00' }],
    territories: [{ countryCode: ['WW'], releaseDate: '2019-08-01T00:00:00' }],
    tracks: [
        {
            trackNumber: 1,
            title: 'T',
            displayArtist: 'Someone',
            permissions: [{ type: ['stream'], enabled: true, startDate: '2019-07-19T00:00:00' }],
        },
    ],
};

/** Every fixture is serialized to a golden file and validated against the XSD. */
export const FIXTURES: ReadonlyArray<{ name: string; input: ReleaseInput }> = [
    { name: 'minimal', input: minimal },
    { name: 'sample', input: SAMPLE_RELEASE },
    { name: 'unicode', input: unicode },
    { name: 'multi-disc', input: multiDisc },
    { name: 'multi-territory', input: multiTerritory },
    { name: 'audiosalad-date-shapes', input: audiosaladDateShapes },
];
