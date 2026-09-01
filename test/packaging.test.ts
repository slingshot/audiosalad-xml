import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync } from 'node:fs';
import pkg from '../package.json';

const DIST = new URL('../dist/', import.meta.url);
const built = existsSync(DIST);

describe('package manifest', () => {
    test('ships zero runtime dependencies', () => {
        expect(pkg.dependencies).toEqual({});
    });

    test('declares no dependency the source no longer uses', () => {
        // 0.1.x's xml-escape / xml-formatter lingered in devDependencies after
        // the rewrite, contradicting the 1.0 changeset.
        const dev = Object.keys(pkg.devDependencies);
        for (const dead of ['xml-escape', 'xml-formatter', '@types/xml-escape']) {
            expect(dev, `${dead} is no longer used`).not.toContain(dead);
        }
    });

    test('carries no install lifecycle script', () => {
        // A `prepare` script survives into the tarball and makes npm warn every
        // consumer about an unapproved install script — for a hook installer
        // that has no function outside this repo.
        for (const name of ['prepare', 'preinstall', 'install', 'postinstall']) {
            expect(pkg.scripts, `${name} would run on consumers' machines`).not.toHaveProperty(
                name,
            );
        }
    });

    test('resolves CJS and ESM types separately', () => {
        const root = pkg.exports['.'];
        expect(root.import.types).toBe('./dist/index.d.ts');
        expect(root.require.types).toBe('./dist/index.d.cts');
    });

    test('stays at 0.1.5 until changesets applies the major bump', () => {
        expect(pkg.version).toBe('0.1.5');
    });
});

describe.if(built)('build output', () => {
    test('declaration files reference no sourcemap that is not shipped', async () => {
        const files = readdirSync(DIST);
        for (const name of files.filter((f) => f.endsWith('.d.ts') || f.endsWith('.d.cts'))) {
            const text = await Bun.file(new URL(name, DIST)).text();
            expect(text, `${name} advertises a map that is not emitted`).not.toContain(
                'sourceMappingURL',
            );
        }
    });

    test('every sourcemap a build artifact references is present', async () => {
        const files = readdirSync(DIST);
        for (const name of files.filter((f) => f.endsWith('.js') || f.endsWith('.cjs'))) {
            const text = await Bun.file(new URL(name, DIST)).text();
            const mapName = /\/\/# sourceMappingURL=(\S+)/.exec(text)?.[1];
            if (mapName !== undefined) {
                expect(files, `${name} references ${mapName}`).toContain(mapName);
            }
        }
    });
});
