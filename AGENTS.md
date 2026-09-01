# AGENTS.md

Guidance for coding agents and new contributors working in this repository.

## What this is

`@ssh/audiosalad-xml` builds, validates, and parses AudioSalad release XML
against schema **v3.4** (`schemas/audiosalad_release_v3.4.xsd`). It ships with
**zero runtime dependencies** — that is a hard constraint, not a preference.

## Commands

| Command | Purpose |
|---|---|
| `bun install` | Install dependencies |
| `bun test` | Run the full suite |
| `bun run check` | Lint, typecheck, and test — run before pushing |
| `bun run build` | Build to `dist/` with tsdown |
| `bun run size` | Assert the gzipped bundle budget |
| `bun run check:exports` | publint + are-the-types-wrong |
| `bun run docs` | Generate typedoc into `api-docs/` |
| `bun run changeset` | Record a release note; required for any user-facing change |
| `UPDATE_GOLDEN=1 bun test` | Regenerate golden files after an intended change |

## The one architectural rule

**Element order, cardinality, and facets live in exactly one place: the
descriptor table for that complexType, in `src/spec/v3_4/`.**

Never hand-write XML strings. Never hand-write a `.map()` that emits repeated
elements. The kernel in `src/core/descriptor.ts` reads each table and derives
both directions:

- `buildNode` — format values and collect issues, in one walk. `validateRelease`
  is this function with the tree discarded, so validation and serialization
  cannot disagree.
- `parseNode` — invert the walk.

Table order **is** XSD sequence order. If the two disagree, the table is wrong.

## Adding a field from the XSD

1. Add the descriptor to the right table in `src/spec/v3_4/`, **at the position
   the XSD sequence puts it**. Copy facets (`pattern`, `minLength`, `maxLength`,
   `values`) verbatim from the schema.
2. Add the corresponding optional property to the input interface in
   `src/model/index.ts`, with a doc comment naming the XML element it maps to.
3. Add a case to the ordering test in `test/spec/release.test.ts`.
4. Run `UPDATE_GOLDEN=1 bun test` and **review the golden diff** — it is the
   change's real output.

Nothing else is needed. Build, validate, and parse all pick the field up.

## Known traps

These produced real, shipped bugs in 0.1.x. The kernel makes them
inexpressible in spec code, but they remain easy to reintroduce elsewhere.

1. **`forEach` in a template.** `xs?.forEach(x => x.xml()) ?? ''` types as
   `string` and evaluates to `''`, because `forEach` returns `undefined`. Three
   element groups vanished this way for four releases. Use the kernel.
2. **Falsy guards on numbers.** `n ? emit(n) : ''` drops a legitimate `0`.
   `preview_start: 0` means "preview from the start". Presence is
   `value !== undefined`.
3. **`Date` is an instant, not a calendar date.** Reading it in UTC is a
   deliberate, documented choice, not a bug to "fix" — `new Date(2020, 4, 2)`
   is local midnight and `new Date('2020-05-02')` is UTC midnight, so no single
   rule reads both as May 2. Changing to local getters would trade one silent
   off-by-one for another. `test/core/datetime.test.ts` pins the behaviour
   under three timezones; steer callers to strings instead.
4. **Type-only exports.** `export { SomeType }` for a type breaks every modern
   bundler. `verbatimModuleSyntax` now catches it; use `export type`.
5. **Escaping is not enough.** XML 1.0 cannot represent C0 control characters or
   lone surrogates at all, even as character references. `findIllegalChar`
   catches them before they reach output.

## Tests

Six groups, all under `test/`:

- **unit** (`test/core/`, `test/spec/`) — the kernel and each table
- **golden** (`test/golden.test.ts`) — fixtures serialized to committed XML and
  validated against the XSD with `xmllint-wasm`
- **property** (`test/property.test.ts`) — `build(parse(build(x))) === build(x)`
  over generated inputs, plus XSD validation of each
- **regression** (`test/regressions.test.ts`) — one named test per 0.1.x defect,
  plus a guard that scans every test file for the discarded-matcher and
  un-awaited-matcher patterns that let 0.1.x ship a suite asserting nothing
- **surface** (`test/api.test.ts`, `test/legacy.test.ts`, `test/smoke.test.ts`) —
  the public API, the class facade, and the barrel-loading guard tied to trap #4
- **packaging** (`test/packaging.test.ts`) — manifest and build-output invariants:
  zero runtime deps, no install lifecycle script, no dangling sourcemap reference

Add a regression test whenever you fix a bug, and name the defect in it.

## Commits and releases

Conventional commits are enforced by a `commit-msg` hook and by CI on every
commit in a pull request. Breaking changes need a `BREAKING CHANGE:` footer.

Releases run on changesets. Add one with `bun run changeset`; merging the
generated "Version Packages" PR publishes to npm.

## Repository preconditions

These require an owner and are not automatable from a working copy:

1. `NPM_TOKEN` repository secret, with publish rights to the `@ssh` scope.
2. **Settings → Actions → General** — allow Actions to create and approve pull
   requests, so changesets can open its version PR.
3. **Settings → Pages** — source set to *GitHub Actions*, since typedoc output
   is no longer committed to `docs/`.
4. npm provenance requires a public repository. If this repo is private, remove
   `NPM_CONFIG_PROVENANCE` from `release.yml` and `publishConfig.provenance`
   from `package.json`.
