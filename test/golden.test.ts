import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRelease, parseRelease } from '../src/api';
import { FIXTURES } from './fixtures';
import { expectInvalidAgainstXsd, expectValidAgainstXsd } from './helpers/xsd';

const goldenPath = (name: string): string =>
    fileURLToPath(new URL(`./golden/${name}.xml`, import.meta.url));

describe('golden files', () => {
    for (const { name, input } of FIXTURES) {
        describe(name, () => {
            const xml = buildRelease(input);

            test('validates against the v3.4 XSD', async () => {
                await expectValidAgainstXsd(xml);
            });

            test('matches the committed golden file', () => {
                const path = goldenPath(name);
                // Only UPDATE_GOLDEN=1 may write. Regenerating a *missing* file
                // automatically would let an accidental deletion pass CI.
                if (process.env.UPDATE_GOLDEN === '1') {
                    writeFileSync(path, xml);
                }
                if (!existsSync(path)) {
                    throw new Error(
                        `Golden file ${path} is missing. If this fixture is new, run ` +
                            'UPDATE_GOLDEN=1 bun test and commit the result.',
                    );
                }
                expect(xml).toBe(readFileSync(path, 'utf8'));
            });

            test('survives a build/parse/build round trip', () => {
                expect(buildRelease(parseRelease(xml))).toBe(xml);
            });
        });
    }
});

describe('the harness itself detects invalidity', () => {
    test('a release missing its title fails XSD validation', async () => {
        const broken = buildRelease(FIXTURES[0]!.input).replace(/<title>.*<\/title>\n/, '');
        const errors = await expectInvalidAgainstXsd(broken);
        expect(errors.join('\n')).toContain('This element is not expected');
    });
});
