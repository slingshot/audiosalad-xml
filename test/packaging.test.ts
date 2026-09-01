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

    test('version is managed by changesets, not hand-edited', async () => {
        // An earlier version of this test asserted `version === '0.1.5'`, which
        // was right before the first release and then blocked every release
        // after it — changesets bumping the version is the intended behaviour.
        // Assert the durable property instead: package.json and the CHANGELOG
        // move together, which is true after `changeset version` and false if
        // someone edits the version by hand.
        expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);

        const changelog = await Bun.file(new URL('../CHANGELOG.md', import.meta.url)).text();
        const latest = /^## (\S+)/m.exec(changelog)?.[1];
        if (latest === undefined) {
            throw new Error('CHANGELOG.md has no `## <version>` heading to compare against');
        }
        expect(pkg.version, 'package.json and CHANGELOG.md disagree').toBe(latest);
    });

    test('leaves provenance to npm Trusted Publishing', () => {
        // Under OIDC, npm attaches provenance itself. Setting it explicitly is
        // redundant and pushes npm onto the token-based provenance path, which
        // has no token to use.
        expect(pkg.publishConfig).not.toHaveProperty('provenance');
        expect(pkg.publishConfig.access).toBe('public');
    });
});

describe('release workflow', () => {
    const workflow = () =>
        Bun.file(new URL('../.github/workflows/release.yml', import.meta.url)).text();

    test('publishes via OIDC, with no npm token anywhere', async () => {
        const yml = await workflow();
        // An .npmrc token silently wins over OIDC, so trusted publishing would
        // never engage and the failure would be invisible until an audit.
        for (const token of ['NPM_TOKEN', 'NODE_AUTH_TOKEN', '_authToken']) {
            expect(yml, `${token} would bypass Trusted Publishing`).not.toContain(token);
        }
        expect(yml).not.toContain('NPM_CONFIG_PROVENANCE');
    });

    test('grants the id-token permission OIDC requires', async () => {
        expect(await workflow()).toContain('id-token: write');
    });

    test('publishes from a GitHub-hosted runner', async () => {
        // npm refuses to verify a provenance bundle built on a self-hosted
        // runner, and Trusted Publishing always attaches provenance. Namespace
        // runners register as self-hosted, so the release job — alone among
        // this repo's jobs — must not use one.
        const yml = await workflow();
        expect(yml, 'the release job must not use a self-hosted runner').not.toContain(
            'runs-on: namespace-',
        );
        expect(yml).toContain('runs-on: ubuntu-latest');
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
