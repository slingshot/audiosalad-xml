import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    platform: 'neutral',
    // A bare `sourcemap: true` stamps a sourceMappingURL into the .d.ts/.d.cts
    // without emitting the map, so every consumer's go-to-definition resolves
    // to a 404. Declaration maps would also point at ../src, which
    // `files: ["dist"]` does not publish, so suppress them explicitly and keep
    // sourcemaps for the JS output only.
    dts: true,
    // JS only, in effect: scripts/postbuild.ts strips the sourceMappingURL that
    // tsdown also stamps into the .d.ts/.d.cts, for which it emits no map.
    sourcemap: true,
    clean: true,
    treeshake: true,
});
