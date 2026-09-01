import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

/**
 * Budget in bytes for the gzipped ESM bundle. Raise deliberately, never casually.
 *
 * Measured baseline at 1.0: 16.61 KB gzipped. The bulk is unavoidable public
 * surface — the ISO country enums, one descriptor table per v3.4 complexType,
 * and the legacy facade (including `Release.sample()`). The headroom here is
 * for incremental spec growth; a jump that eats it means something new is
 * being pulled in, and that is the regression this guard exists to catch.
 */
const LIMIT_GZIP = 20 * 1024;

const path = 'dist/index.js';
const raw = statSync(path).size;
const gzip = gzipSync(readFileSync(path)).byteLength;

const kb = (n: number): string => `${(n / 1024).toFixed(2)} KB`;
console.log(`${path}: ${kb(raw)} raw, ${kb(gzip)} gzipped (budget ${kb(LIMIT_GZIP)})`);

if (gzip > LIMIT_GZIP) {
    console.error(`Bundle exceeds the gzip budget by ${kb(gzip - LIMIT_GZIP)}.`);
    process.exit(1);
}
