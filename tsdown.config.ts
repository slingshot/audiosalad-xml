import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'tsdown';

/**
 * tsdown stamps a `//# sourceMappingURL` into the declaration files as well as
 * the JS, but emits no declaration map to go with it, so every consumer editor
 * that follows declaration maps for go-to-definition resolves a 404.
 *
 * `dts.sourcemap` does not override the top-level flag, and emitting the maps
 * is no better: they carry no `sourcesContent` and point at `../src`, which
 * `files: ["dist"]` does not publish. So strip the comment.
 *
 * This runs as a `build:done` hook rather than a separate npm script so that a
 * bare `tsdown` cannot produce a broken artifact.
 */
const stripDanglingDeclarationMaps = async (outDir: string): Promise<void> => {
    const dangling = /\n?\/\/# sourceMappingURL=\S*\.d\.m?c?ts\.map\s*$/;
    let stripped = 0;
    for (const name of await readdir(outDir)) {
        if (!name.endsWith('.d.ts') && !name.endsWith('.d.cts')) continue;
        const path = join(outDir, name);
        const before = await readFile(path, 'utf8');
        const after = before.replace(dangling, '\n');
        if (after !== before) {
            await writeFile(path, after);
            stripped += 1;
        }
    }
    if (stripped > 0) {
        console.info(`stripped ${stripped} dangling declaration sourcemap comment(s)`);
    }
};

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'neutral',
    dts: true,
    // JS only in effect — the hook below removes the declaration-file comment.
    sourcemap: true,
    clean: true,
    treeshake: true,
    hooks: {
        'build:done': async (context) => {
            await stripDanglingDeclarationMaps(context.options.outDir);
        },
    },
});
