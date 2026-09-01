import { describe, expect, test } from 'bun:test';
import {
    formatDate,
    formatDateTime,
    formatGYear,
    formatPartialDate,
} from '../../src/core/datetime';

describe('formatDate', () => {
    test('formats a Date in UTC', () => {
        expect(formatDate(new Date(Date.UTC(2020, 4, 2)))).toBe('2020-05-02');
    });

    test('reads the UTC fields, not the local ones', () => {
        // 23:30 UTC is still May 2 in UTC, whatever the host timezone is.
        expect(formatDate(new Date(Date.UTC(2020, 4, 2, 23, 30)))).toBe('2020-05-02');
    });

    test('rejects an impossible calendar date', () => {
        expect(formatDate('2020-02-30')).toBeUndefined();
        expect(formatDate('2020-13-01')).toBeUndefined();
        expect(formatDate('2016-02-29')).toBe('2016-02-29');
    });

    test('passes through a valid YYYY-MM-DD string', () => {
        expect(formatDate('2020-05-02')).toBe('2020-05-02');
    });

    test('rejects a malformed string', () => {
        expect(formatDate('2020/05/02')).toBeUndefined();
        expect(formatDate('2020-13-02')).toBeUndefined();
    });

    test('rejects an invalid Date', () => {
        expect(formatDate(new Date('nope'))).toBeUndefined();
    });
});

describe('formatDateTime', () => {
    test('formats in UTC with no fractional seconds', () => {
        expect(formatDateTime(new Date(Date.UTC(2020, 4, 2, 21, 0, 0)))).toBe(
            '2020-05-02T21:00:00Z',
        );
    });

    test('passes through a valid dateTime string', () => {
        expect(formatDateTime('2017-01-01T00:00:00Z')).toBe('2017-01-01T00:00:00Z');
    });

    test('accepts an offset-bearing string', () => {
        expect(formatDateTime('2017-01-01T00:00:00+02:00')).toBe('2017-01-01T00:00:00+02:00');
    });

    test('rejects a bare date string', () => {
        expect(formatDateTime('2017-01-01')).toBeUndefined();
    });

    test('rejects impossible components that pass a shape-only regex', () => {
        expect(formatDateTime('2020-99-99T25:61:61Z')).toBeUndefined();
        expect(formatDateTime('2020-02-30T00:00:00Z')).toBeUndefined();
        expect(formatDateTime('2020-01-01T00:00:00+99:00')).toBeUndefined();
    });

    test('accepts the legal edge cases', () => {
        // xs:dateTime permits 24:00:00 and a :60 leap second; offsets reach 14:00.
        expect(formatDateTime('2020-01-01T24:00:00Z')).toBe('2020-01-01T24:00:00Z');
        expect(formatDateTime('2020-01-01T00:00:60Z')).toBe('2020-01-01T00:00:60Z');
        expect(formatDateTime('2020-01-01T00:00:00+14:00')).toBe('2020-01-01T00:00:00+14:00');
    });
});

describe('formatGYear', () => {
    test('accepts a number', () => {
        expect(formatGYear(2020)).toBe('2020');
    });

    test('accepts a four-digit string', () => {
        expect(formatGYear('2020')).toBe('2020');
    });

    test('takes the UTC year from a Date', () => {
        expect(formatGYear(new Date(Date.UTC(2020, 0, 1)))).toBe('2020');
    });

    test('rejects a two-digit year', () => {
        expect(formatGYear(20)).toBeUndefined();
    });
});

describe('formatPartialDate', () => {
    test('accepts a full date', () => {
        expect(formatPartialDate('2020-05-02')).toBe('2020-05-02');
    });

    test('accepts a year and month', () => {
        expect(formatPartialDate('2020-05')).toBe('2020-05');
    });

    test('accepts a bare year', () => {
        expect(formatPartialDate('2020')).toBe('2020');
    });

    test('formats a Date as a full date', () => {
        expect(formatPartialDate(new Date(Date.UTC(2020, 4, 2)))).toBe('2020-05-02');
    });

    test('rejects a malformed value', () => {
        expect(formatPartialDate('May 2020')).toBeUndefined();
    });

    test('rejects an impossible month', () => {
        expect(formatPartialDate('2020-99')).toBeUndefined();
        expect(formatPartialDate('2020-00')).toBeUndefined();
        expect(formatPartialDate('2020-13')).toBeUndefined();
    });
});

describe('UTC behaviour is pinned, not incidental', () => {
    // A `Date` is an instant; a release date is a calendar date. There is no
    // rule that reads both `new Date(2020, 4, 2)` (local midnight) and
    // `new Date('2020-05-02')` (UTC midnight) as May 2. We keep 0.1.x's UTC
    // behaviour and document it; this test stops it drifting.
    // Run under: TZ=UTC, TZ=America/Los_Angeles, TZ=Asia/Tokyo
    test('a UTC instant formats identically in any host timezone', () => {
        expect(formatDate(new Date('2020-05-02T00:00:00Z'))).toBe('2020-05-02');
        expect(formatDateTime(new Date('2020-05-02T21:00:00Z'))).toBe('2020-05-02T21:00:00Z');
    });
});
