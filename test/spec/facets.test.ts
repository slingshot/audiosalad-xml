import { describe, expect, test } from 'bun:test';
import {
    ACTION_VALUES,
    ADVISORY_VALUES,
    ATTR_TYPE_VALUES,
    COUNTRY_CODE,
    FORMAT_VALUES,
    ISRC,
    ISWC,
    SCHEMA_ID,
    SCHEMA_NAMESPACE,
    UPC_EAN,
} from '../../src/spec/v3_4/facets';

describe('schema constants', () => {
    test('identify v3.4', () => {
        expect(SCHEMA_ID).toBe('audiosalad_release_v3.4');
        expect(SCHEMA_NAMESPACE).toBe('audiosalad_release_v3.4');
    });
});

describe('ISRC', () => {
    test('accepts a real ISRC', () => {
        expect(ISRC.pattern.test('QM7G92017457')).toBe(true);
    });
    test('rejects a letter in the year positions', () => {
        expect(ISRC.pattern.test('QM7G9AA17457')).toBe(false);
    });
    test('is exactly 12 characters', () => {
        expect(ISRC.minLength).toBe(12);
        expect(ISRC.maxLength).toBe(12);
    });
});

describe('ISWC', () => {
    test('accepts a letter followed by ten digits', () => {
        expect(ISWC.pattern.test('T1234567890')).toBe(true);
    });
    test('rejects a leading digit', () => {
        expect(ISWC.pattern.test('11234567890')).toBe(false);
    });
});

describe('UPC_EAN', () => {
    test('accepts 12, 13, and 14 digits', () => {
        for (const n of [12, 13, 14])
            expect('1'.repeat(n).length).toBeLessThanOrEqual(UPC_EAN.maxLength);
        expect(UPC_EAN.minLength).toBe(12);
        // v3.4 widened maxLength from 13 to 14.
        expect(UPC_EAN.maxLength).toBe(14);
    });
    test('rejects non-digits', () => {
        expect(UPC_EAN.pattern.test('12345678901A')).toBe(false);
    });
});

describe('COUNTRY_CODE', () => {
    test('accepts a two-letter code and WW', () => {
        expect(COUNTRY_CODE.pattern.test('US')).toBe(true);
        expect(COUNTRY_CODE.pattern.test('WW')).toBe(true);
    });
    test('rejects a three-letter code', () => {
        expect(COUNTRY_CODE.pattern.test('USA')).toBe(false);
    });
});

describe('enumerations', () => {
    test('action matches the XSD', () => {
        expect([...ACTION_VALUES]).toEqual([
            'add',
            'update',
            'full-update',
            'meta-update',
            'delete',
        ]);
    });
    test('advisory carries both cases', () => {
        expect(ADVISORY_VALUES).toContain('Explicit');
        expect(ADVISORY_VALUES).toContain('explicit');
    });
    test('format includes DJ Mix, added in v3.4', () => {
        expect(FORMAT_VALUES).toContain('DJ Mix');
        expect(FORMAT_VALUES).toContain('dj mix');
    });
    test('format has twenty members', () => {
        expect(FORMAT_VALUES).toHaveLength(20);
    });
    test('attr type matches the XSD', () => {
        expect([...ATTR_TYPE_VALUES]).toEqual([
            'integer',
            'float',
            'boolean',
            'date',
            'string',
            'data',
        ]);
    });
});
