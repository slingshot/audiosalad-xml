import { describe, expect, test } from 'bun:test';
import { buildRelease, validateRelease } from '../src/api';
import { Asset, Participant, Release, Territory, Track } from '../src/legacy/classes';
import type { ReleaseInput } from '../src/model';

const base: ReleaseInput = {
    action: 'add',
    title: 'T',
    displayArtist: 'A',
    tracks: [{ trackNumber: 1, title: 'T', displayArtist: 'A' }],
};

describe('0.1.x regressions', () => {
    test('defect 1: participant artist_id is emitted', () => {
        const xml = new Participant({
            role: 'Main Artist',
            name: 'A',
            artistID: [{ type: 'spotify', id: 's1' }],
        }).xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<id>s1</id>');
    });

    test('defect 2: asset attr is emitted', () => {
        const xml = new Asset({
            type: 'audio',
            fileName: 'a.wav',
            attr: [{ key: 'k', value: 'v' }],
        }).xml();
        expect(xml).toContain('<attr>');
        expect(xml).toContain('<key>k</key>');
    });

    test('defect 3: territory permission is emitted', () => {
        const xml = new Territory({
            countryCode: ['WW'],
            permissions: [{ type: ['stream'], enabled: true }],
        }).xml();
        expect(xml).toContain('<permission>');
    });

    test('defect 4: a numeric zero is not dropped', () => {
        const xml = new Track({
            trackNumber: 1,
            title: 'T',
            displayArtist: 'A',
            previewStart: 0,
            bpm: 0,
            trackLength: 0,
        }).xml();
        expect(xml).toContain('<preview_start>0</preview_start>');
        expect(xml).toContain('<bpm>0</bpm>');
        expect(xml).toContain('<track_length>0</track_length>');
    });

    test('defect 4b: a false boolean is not dropped', () => {
        expect(buildRelease({ ...base, compilation: false })).toContain(
            '<compilation>false</compilation>',
        );
    });

    test('defect 5: XML-illegal characters are refused, not emitted', () => {
        const bad = { ...base, title: `Bad${String.fromCharCode(7)}Title` };
        expect(validateRelease(bad)[0]).toMatchObject({ path: 'title', code: 'illegalChar' });
        expect(() => buildRelease(bad)).toThrow();
        expect(buildRelease(bad, { onIllegalChars: 'strip' })).toContain('<title>BadTitle</title>');
    });

    test('documented, not a defect: a Date is read in UTC', () => {
        // 0.1.x did the same thing. This pins the behaviour rather than
        // claiming a fix; pass a string for an unambiguous calendar date.
        const xml = buildRelease({ ...base, releaseDate: new Date('2020-05-02T23:30:00Z') });
        expect(xml).toContain('<release_date>2020-05-02</release_date>');
        expect(buildRelease({ ...base, releaseDate: '2020-05-02' })).toContain(
            '<release_date>2020-05-02</release_date>',
        );
    });

    test('defect 6: the public barrel loads and exports values', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        expect(typeof mod.buildRelease).toBe('function');
        expect(typeof mod.Release).toBe('function');
    });

    test('defect 7: the suite actually asserts — a broken release throws', () => {
        expect(() => buildRelease({ ...base, tracks: [] })).toThrow();
    });

    test('multi-line text is not collapsed', () => {
        const xml = buildRelease({
            ...base,
            texts: [{ type: 'Liner Notes', content: 'one\ntwo\nthree' }],
        });
        expect(xml).toContain('one\ntwo\nthree');
    });

    test('the 0.1.x class defaults still apply', () => {
        // Regression for the facade rewrite: dropping these would turn
        // previously valid partial constructions into validation failures.
        expect(new Track({ title: 'T', displayArtist: 'A' }).trackNumber).toBe(1);
        expect(new Participant({ name: 'A' }).primary).toBe(false);
    });

    test('a repeated field rejects the 0.1.x scalar shape', () => {
        // Permission.type became a list in v3.4; wrapping silently would hide it.
        expect(
            validateRelease({
                ...base,
                permissions: [{ type: 'stream' as unknown as string[], enabled: true }],
            })[0],
        ).toMatchObject({ code: 'cardinality' });
    });

    test('Release.sample() exercises all four previously dropped paths', () => {
        const xml = Release.sample().xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<preview_start>0</preview_start>');
        expect(xml.match(/<attr>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
        expect(xml).toContain('<territory>');
    });
});
