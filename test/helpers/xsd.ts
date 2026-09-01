import { expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateXML } from 'xmllint-wasm';

const SCHEMA = readFileSync(
    fileURLToPath(new URL('../../schemas/audiosalad_release_v3.4.xsd', import.meta.url)),
    'utf8',
);

/**
 * Asserts that `xml` validates against the v3.4 XSD.
 *
 * libxml reports the non-absolute AudioSalad namespace as a warning on every
 * run, and pads real errors with caret context lines, so only entries tagged
 * `Schemas validity error` are genuine failures.
 */
export const expectValidAgainstXsd = async (xml: string): Promise<void> => {
    const result = await validateXML({
        xml: [{ fileName: 'release.xml', contents: xml }],
        schema: [SCHEMA],
    });
    const errors = result.errors
        .filter((e) => /Schemas validity error/.test(e.rawMessage))
        .map((e) => e.rawMessage);
    expect(errors).toEqual([]);
    expect(result.valid).toBe(true);
};

/** Asserts that `xml` does *not* validate, and returns the schema errors. */
export const expectInvalidAgainstXsd = async (xml: string): Promise<string[]> => {
    const result = await validateXML({
        xml: [{ fileName: 'release.xml', contents: xml }],
        schema: [SCHEMA],
    });
    expect(result.valid).toBe(false);
    return result.errors
        .filter((e) => /Schemas validity error/.test(e.rawMessage))
        .map((e) => e.rawMessage);
};
