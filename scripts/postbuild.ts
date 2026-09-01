/**
 * Strips the `//# sourceMappingURL` comment tsdown stamps into the declaration
 * files.
 *
 * `sourcemap: true` is scoped to the JS output by intent — those maps embed
 * their sources and work standalone. tsdown appends the comment to `.d.ts` and
 * `.d.cts` as well but emits no corresponding map, so every consumer editor that
 * follows declaration maps for go-to-definition resolves a 404. Emitting the
 * maps instead is not a fix either: they carry no `sourcesContent` and point at
 * `../src`, which `files: ["dist"]` does not publish.
 */
import { readdirSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);
const DANGLING = /\n?\/\/# sourceMappingURL=.*\.d\.m?c?ts\.map\s*$/;

let stripped = 0;
for (const name of readdirSync(DIST)) {
    if (!name.endsWith('.d.ts') && !name.endsWith('.d.cts')) continue;
    const path = new URL(name, DIST);
    const before = await Bun.file(path).text();
    const after = before.replace(DANGLING, '\n');
    if (after !== before) {
        await Bun.write(path, after);
        stripped += 1;
    }
}
console.log(`postbuild: stripped ${stripped} dangling declaration sourcemap comment(s)`);
