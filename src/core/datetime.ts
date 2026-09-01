export type DateLike = Date | string;

// The timezone suffix is OPTIONAL in both xs:date and xs:dateTime. AudioSalad's
// own exports use unzoned values for permission/start_date and territory/
// release_date, so requiring one rejects real documents the schema accepts.
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:Z|[+-]\d{2}:\d{2})?$/;
const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;
const YEAR_RE = /^\d{4}$/;
const DATETIME_RE =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

const isValidDate = (d: Date): boolean => !Number.isNaN(d.getTime());
const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** True when y-m-d denotes a real calendar day (rejects 2020-02-30, 2020-13-01). */
const isRealYmd = (y: number, m: number, d: number): boolean => {
    if (m < 1 || m > 12 || d < 1) return false;
    const probe = new Date(Date.UTC(y, m - 1, d));
    return (
        probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
    );
};

const isRealTime = (h: number, min: number, sec: number): boolean =>
    h >= 0 && h <= 24 && min >= 0 && min <= 59 && sec >= 0 && sec <= 60;

const isRealOffset = (off: string | undefined): boolean => {
    if (off === undefined || off === 'Z') return true;
    const h = Number(off.slice(1, 3));
    const m = Number(off.slice(4, 6));
    return h <= 14 && m <= 59 && !(h === 14 && m > 0);
};

/** `xs:date` — a `Date` is read in **UTC**; a string is validated component-wise. */
export const formatDate = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        const m = DATE_RE.exec(v);
        if (!m) return undefined;
        return isRealYmd(Number(m[1]), Number(m[2]), Number(m[3])) ? v : undefined;
    }
    if (!isValidDate(v)) return undefined;
    return `${pad(v.getUTCFullYear(), 4)}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
};

/** `xs:dateTime` — UTC, no fractional seconds, matching AudioSalad's examples. */
export const formatDateTime = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        const m = DATETIME_RE.exec(v);
        if (!m) return undefined;
        const ok =
            isRealYmd(Number(m[1]), Number(m[2]), Number(m[3])) &&
            isRealTime(Number(m[4]), Number(m[5]), Number(m[6])) &&
            isRealOffset(m[7]);
        // Passed through verbatim: an unzoned value stays unzoned, so a
        // round trip does not invent a timezone the source did not state.
        return ok ? v : undefined;
    }
    if (!isValidDate(v)) return undefined;
    const date = `${pad(v.getUTCFullYear(), 4)}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    const time = `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`;
    return `${date}T${time}Z`;
};

/** `xs:gYear` — a four-digit year. */
export const formatGYear = (v: DateLike | number): string | undefined => {
    if (typeof v === 'number') {
        return Number.isInteger(v) && v >= 1000 && v <= 9999 ? String(v) : undefined;
    }
    if (typeof v === 'string') return YEAR_RE.test(v) ? v : undefined;
    if (!isValidDate(v)) return undefined;
    const y = v.getUTCFullYear();
    return y >= 1000 && y <= 9999 ? String(y) : undefined;
};

/** `partial_date` — the union of `xs:date`, `xs:gYearMonth`, and `xs:gYear`. */
export const formatPartialDate = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        if (YEAR_RE.test(v)) return v;
        const ym = YEAR_MONTH_RE.exec(v);
        if (ym) {
            const month = Number(ym[2]);
            return month >= 1 && month <= 12 ? v : undefined;
        }
        return formatDate(v);
    }
    return formatDate(v);
};
