import { describe, expect, test } from 'bun:test';
import { ParticipantRole, ReleaseFormat } from '../../src/enums';
import { FORMAT_VALUES } from '../../src/spec/v3_4/facets';

describe('ReleaseFormat', () => {
    test('every member is a legal format_type value', () => {
        for (const v of Object.values(ReleaseFormat)) {
            expect(FORMAT_VALUES as readonly string[]).toContain(v);
        }
    });
    test('exposes the v3.4 DJ Mix format', () => {
        expect(ReleaseFormat.DJMix).toBe('dj mix');
    });
    test('keeps the misspelled 0.1.x alias working', () => {
        expect(ReleaseFormat.ClassicAlbum).toBe(ReleaseFormat.ClassicalAlbum);
    });
});

describe('ParticipantRole', () => {
    test('adds the roles the XSD documents', () => {
        expect(ParticipantRole.PrimaryArtist).toBe('Primary Artist');
        expect(ParticipantRole.Publisher).toBe('Publisher');
    });
});
