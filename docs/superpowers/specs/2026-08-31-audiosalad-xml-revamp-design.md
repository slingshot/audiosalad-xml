# audiosalad-xml 1.0 — Revamp Design

**Date:** 2026-08-31
**Status:** Approved, pending implementation plan
**Target version:** 1.0.0 (current published: 0.1.5, June 2022)

---

## 1. Context

`@ssh/audiosalad-xml` adapts AudioSalad's custom XML delivery specification to a
TypeScript-friendly form. Today it exposes mutable classes whose `.xml()` method
builds output by string-templating and calls `xml-formatter` on every nested
node.

That architecture has produced seven defects, all reproduced against the current
`main`:

| # | Defect | Effect |
|---|---|---|
| 1 | `Participant.xml()` uses `this.artistID?.forEach(...)` | `<artist_id>` is **never emitted** |
| 2 | `Asset.xml()` uses `this.attr?.forEach(...)` | asset `<attr>` is **never emitted** |
| 3 | `Territory.xml()` uses `this.permissions?.forEach(...)` | territory `<permission>` is **never emitted** |
| 4 | Falsy guards (`this.bpm ? ... : ''`) on numeric fields | a legitimate `0` is dropped — `preview_start: 0` silently vanishes |
| 5 | `xml-escape` does not handle XML-illegal control characters | emits documents no conformant parser accepts (verified with U+0007) |
| 6 | `index.ts` re-exports the *type* `AudioSaladXML` as a value | **breaks every modern bundler**; Bun cannot load `src/index.ts` at all |
| 7 | `test/xml.test.ts` does `await expect(await validateXMLWithXSD(...)).resolves` | accesses a getter and discards it — **no matcher runs; the suite asserts nothing** |

Defects 1–3 share a root cause worth naming, because it is invisible to the type
checker: `Array.prototype.forEach` returns `undefined`, and `undefined ?? ''` is
`''`. The expression types as `string` and reads as deliberate. Defect 7 is why
none of this was caught.

**Not a defect, but a sharp edge.** `date.toISOString().split('T')[0]` reads a
`Date` in UTC. That is surprising for a *calendar* date — in `America/Los_Angeles`
a `Date` built from local May 2nd serializes as May 3rd. It is nonetheless the
behaviour every 0.1.x caller already has, and no formatting rule fixes both
`new Date(2020, 4, 2)` (local midnight) and `new Date('2020-05-02')` (UTC
midnight). §3.3 keeps UTC, documents it, and steers callers to strings.

### 1.1 Specification delta, v3.2 → v3.4

Diffed with whitespace normalised (the new file re-indents from tabs to spaces,
which makes a raw diff useless). The semantic changes are:

| Change | Impact |
|---|---|
| `targetNamespace`/`xmlns` → `audiosalad_release_v3.4`; `schema_id` fixed value follows | Root element and `schema_id` both change |
| **`dsp_delivery` element and `dsp_delivery_type` removed entirely** | The `Delivery` class has no home in v3.4 |
| `permission_type/type` → `maxOccurs="unbounded"` | `Permission.type` becomes a list |
| `permission_type` gains `attr` (unbounded, before `country_code`) | New field |
| `asset_type/md5_checksum` → `minOccurs="0"` | Now optional |
| `upc_ean_type` `maxLength` 13 → 14 | Wider barcodes accepted |
| `format_type` gains `DJ Mix` / `dj mix` | New enum member |

No other element, type, or facet changed.

---

## 2. Goals and non-goals

### Goals

1. Emit XML that is correct against `audiosalad_release_v3.4.xsd` by construction.
2. Validate input against the schema's real constraints, reporting structured
   issues with paths, before invalid XML reaches AudioSalad's ingest.
3. Parse AudioSalad XML back into typed objects.
4. Ship zero runtime dependencies.
5. Keep the existing class API working wherever the spec did not force a break.
6. Replace an abandoned toolchain (tsdx, eslint 7, airbnb) with maintained tools.
7. Make the release process automatic, and every commit conventional.

### Non-goals

- **v3.2 output is not a supported target.** v3.4 only. Consumers still on a v3.2
  endpoint should pin `0.1.x`.
- No runtime XSD validation. XSD validation is a test-time concern
  (`xmllint-wasm`); shipping a WASM libxml2 to consumers is disproportionate.
- No network access, no filesystem access, no AudioSalad API client.
- No CLI.

---

## 3. Architecture

```
src/
  index.ts                  public barrel; `export type` for type-only exports
  core/
    node.ts                 XmlNode tree model
    serialize.ts            single-pass serializer, escaping, illegal-char policy
    parse.ts                XML tokenizer → XmlNode (first-party, no dependency)
    descriptor.ts           the kernel: build / validate / parse over a field table
    issues.ts               Issue, IssueCode, AudioSaladValidationError
    datetime.ts             xs:date, xs:dateTime, xs:gYear, partial_date
  spec/
    v3_4/
      index.ts              RELEASE root type + namespace constants
      release.ts            ...one descriptor table per XSD complexType
      track.ts
      participant.ts
      asset.ts
      permission.ts
      territory.ts
      text.ts
      label.ts
      genre.ts
      price-tier.ts
      proprietary-id.ts
      attr.ts
      facets.ts             shared simple-type facets (ISRC, ISWC, UPC, country)
  model/                    hand-written input interfaces, one per complexType
  enums/                    Country, Genre, ParticipantRole, ReleaseFormat, …
  legacy/
    classes.ts              Release/Track/… facade over the core
```

### 3.1 The field-descriptor kernel

The central design decision. Element order, cardinality, and validation rules
currently live in three unrelated places — a template literal, nowhere, and
nowhere. A single ordered table per complexType drives all three behaviours.

```ts
export type Kind =
  | 'string' | 'unsignedInt' | 'boolean'
  | 'date' | 'dateTime' | 'gYear' | 'partialDate'
  | 'complex';

export interface FieldDescriptor<I> {
  /** XML element name. Table order IS the XSD sequence order. */
  el: string;
  /** Key on the input object. Omitted for `const` fields. */
  key?: keyof I & string;
  kind: Kind;
  /** minOccurs */
  min: 0 | 1;
  /** maxOccurs; Infinity for unbounded */
  max: number;
  /** kind === 'complex' */
  type?: ComplexType<any>;
  /** Fixed value emitted regardless of input (e.g. schema_id) */
  const?: string;
  /** Simple-type facets, mirroring the XSD */
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  values?: readonly string[];
}

export interface ComplexType<I> {
  /** XSD complexType name, used in issue messages */
  name: string;
  fields: readonly FieldDescriptor<I>[];
}
```

Two functions consume it:

- `buildNode(type, input, elName, ctx): XmlElement` — walks fields in order,
  formatting values *and* collecting issues in the same pass. `validateRelease`
  is this function with the tree discarded, so validation and serialization
  cannot drift apart.
- `parseNode(type, node, ctx): I` — inverts the walk.

**What this eliminates by construction.** Ordering drift is impossible: there is
one ordered list and the serializer cannot deviate from it. Dropped children are
impossible: arity is a descriptor property (`max > 1` ⇒ map-and-append), never
hand-written JS, so defects 1–3 have no expressible form. Falsy-zero drops are
impossible: presence is `value !== undefined`, never truthiness. And a field
absent from the table does not exist in *any* of build, validate, or parse, so
those three behaviours cannot disagree about the schema.

**Deliberate limit on abstraction.** Descriptors are data; the input interfaces
in `model/` are hand-written TypeScript. Deriving the input types from the tables
via type-level machinery would be clever and unreadable, and would degrade
editor hover text — which is most of this library's value. The cost is that a
new field is added in two places (table + interface); a test asserts the two
agree in shape.

### 3.2 Serialization

`serialize(node, opts)` runs **once**, over the finished tree — replacing the
current `formatXml` call at every nesting level, which re-parses and
re-serializes the whole subtree O(depth) times.

```ts
interface SerializeOptions {
  indent?: string | false;        // default '    '
  xmlDeclaration?: boolean;       // default true
}
```

**Escaping.** `&`, `<`, `>`, `"`, `'` are escaped in text and attribute values.
XML 1.0 permits only `#x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] |
[#x10000-#x10FFFF]`; anything else (including lone surrogates) cannot be
represented even as a character reference. Default behaviour is to raise a
validation issue rather than emit a document that will not parse. `'strip'` is
available for callers ingesting dirty upstream metadata who prefer lossy output
to a hard failure.

**Whitespace.** Leaf text content is emitted verbatim. The current
`collapseContent: true` mangles multi-line `<content>` (lyrics, liner notes);
`Release.sample()` demonstrates this today, leaking template-literal indentation
into the lyric text.

**XML declaration.** `buildRelease` emits `<?xml version="1.0"
encoding="UTF-8"?>` by default — it produces a document, not a fragment. This is
a behaviour change from 0.1.x and is called out in the migration guide.

### 3.3 Dates and times

`Date` is an instant; `release_date` is a calendar date. The two cannot be
reconciled by a formatting rule, because `new Date(2020, 4, 2)` is local
midnight and `new Date('2020-05-02')` is UTC midnight — any single rule reads
one of them off by a day.

The design therefore keeps 0.1.x's behaviour rather than trading one silent
off-by-one for another, and makes it explicit:

- A `Date` is **always formatted in UTC**, documented on every date field.
- A `string` passes through, validated against the target lexical form. **This
  is the recommended form for calendar dates** — it is unambiguous in every
  timezone.

A test pins the UTC behaviour under `TZ=UTC`, `TZ=America/Los_Angeles`, and
`TZ=Asia/Tokyo`, so the choice is locked down rather than incidental.

String inputs are validated component-wise, not merely by shape: a regex alone
accepts `2020-99-99T25:61:61`, which is not a legal `xs:dateTime`.

| Kind | Lexical form | Fields |
|---|---|---|
| `date` | `YYYY-MM-DD` | `release_date` |
| `dateTime` | `YYYY-MM-DDTHH:MM:SSZ` | `export_time`, `global_release_date`, `permission/start_date`, `permission/end_date`, `territory/release_date` |
| `gYear` | `YYYY` | `c_year`, `p_year` |
| `partialDate` | `YYYY` \| `YYYY-MM` \| `YYYY-MM-DD` | `original_release_date` |

`dateTime` output drops fractional seconds (`2020-05-02T00:00:00Z`, not
`…T00:00:00.000Z`). Both are XSD-valid; the former is what AudioSalad's own
examples use.

### 3.4 Parsing

`core/parse.ts` is a small first-party tokenizer producing an `XmlNode` tree. It
handles elements, self-closing tags, attributes, text, CDATA, comments,
processing instructions, the five predefined entities, and numeric character
references. Namespace prefixes are stripped — AudioSalad uses a single default
namespace.

`parseRelease(xml)` then drives `parseNode` over the v3.4 tables.

**Parsing validates.** A parser that accepts anything and returns a value typed
`ReleaseInput` is a lie: a v3.2 document, a wrong `schema_id`, a duplicated
`<title>`, or `<track_number>abc</track_number>` would all "succeed". So
`parseNode` checks, while consuming children, that the document matches the
table — element order, cardinality, required fields, scalar lexical forms — and
`parseRelease` additionally verifies the root element name, its namespace, and
the `schema_id` fixed value.

- Malformed XML throws `SyntaxError`.
- A document that is well-formed but not v3.4 throws `AudioSaladValidationError`.
- `{ onUnknownElement: 'ignore' }` opts into discarding unknown elements only.

Re-running `validateRelease` on the parsed output is *not* sufficient, because
duplicates, ordering, and the original fixed values are already lost by then.

**Round-trip property.** `Date` inputs necessarily become strings after a
round-trip, so the invariant under test is not `parse(build(x)) === x` but:

```
build(parse(build(x))) === build(x)
```

which is the stable formulation and the one `fast-check` will exercise.

---

## 4. Public API

```ts
// Primary surface
function buildRelease(input: ReleaseInput, opts?: BuildOptions): string;
function validateRelease(input: ReleaseInput): Issue[];   // never throws
function parseRelease(xml: string, opts?: ParseOptions): ReleaseInput;

interface BuildOptions extends SerializeOptions {
  /** Skip validation. Default false. Escaping is still applied. */
  validate?: boolean;
  /** Policy for XML-illegal characters, applied while values are formatted. */
  onIllegalChars?: 'error' | 'strip';  // default 'error'
}
interface ParseOptions {
  onUnknownElement?: 'error' | 'ignore';  // default 'error'
}

// Errors
class AudioSaladValidationError extends Error { readonly issues: Issue[] }
interface Issue { path: string; code: IssueCode; message: string }
type IssueCode =
  | 'required' | 'pattern' | 'minLength' | 'maxLength'
  | 'enum' | 'type' | 'cardinality' | 'illegalChar' | 'unknownElement';

// Schema metadata
const SCHEMA_ID: 'audiosalad_release_v3.4';
const SCHEMA_NAMESPACE: 'audiosalad_release_v3.4';
const SCHEMA_LOCATION: 'https://audiosalad-xsd.s3.amazonaws.com/audiosalad_release_v3.4.xsd';
```

`buildRelease` validates first and throws `AudioSaladValidationError` carrying
every issue — not just the first. Callers who prefer not to throw call
`validateRelease` first.

Issue paths use the input shape, not the XML shape: `tracks[0].isrc`, not
`/release/track[1]/isrc`. The caller wrote the former.

### 4.1 Legacy facade

Every class keeps its constructor, public fields, and `.xml()`, and gains
`.validate(): Issue[]`. Internally each builds its input object and delegates to
the core.

```ts
new Release({ title: 'X', tracks: [...] }).xml();       // as before
new Release({ ... }).validate();                        // new
Release.sample();                                       // as before
```

Retained: `Release`, `Track`, `Participant`, `Asset`, `Attr`, `Permission`,
`Territory`, `Text`, `Label`, `GenreType`, `PriceTier`, `ProprietaryID`.

`ProprietaryID` gains the `constructor(partial)` it was missing — it was
previously impossible to construct with values.

The 0.1.x classes initialized several fields (`Release.action`,
`Track.trackNumber`, `Participant.role`/`primary`, `Permission.enabled`,
`Territory.countryCode`, `PriceTier.type`/`name`). **Those defaults are
preserved**, so partial constructions that were valid before remain valid.

### 4.2 Breaking changes

| Change | Reason | Migration |
|---|---|---|
| `Delivery` class and `Release.dspDeliveries` **removed** | `dsp_delivery` deleted from the spec in v3.4 | No v3.4 equivalent. Pin `0.1.x` if you need it. |
| `Permission.type: string` → `string[]` | `maxOccurs` became unbounded | `type: 'stream'` → `type: ['stream']` |
| Namespace and `schema_id` → `audiosalad_release_v3.4` | Spec | Automatic |
| `buildRelease` emits an XML declaration by default | Correctness for documents | `{ xmlDeclaration: false }` |
| Invalid input now throws | Was silently emitting rejected XML | Call `validateRelease` first, or catch |
| Optional booleans emit when `false` | `compilation: false` was silently dropped | More faithful; omit the key for absence |
| Multi-line text is no longer collapsed | `collapseContent` corrupted lyrics | Output is now verbatim |

Additive, non-breaking: `Asset.md5Checksum` optional, `Permission.attr`,
`ReleaseFormat.DJMix`, `ReleaseFormat.ClassicalAlbum` (existing misspelled
`ClassicAlbum` retained as a deprecated alias), `ParticipantRole.PrimaryArtist`
and `.Publisher` (existing `Publicist` retained as deprecated — it appears to
have been a typo for `Publisher`, which is what the XSD lists).

---

## 5. Validation rules

Transcribed directly from the v3.4 facets into `spec/v3_4/facets.ts`:

| Rule | Applies to |
|---|---|
| `[A-Za-z0-9]{5}[0-9]{2}[A-Za-z0-9]{5}`, length 12 | `isrc` |
| `[a-zA-Z][0-9]{10}`, length 11 | `iswc` |
| `[0-9]*`, length 12–14 | `upc_ean` |
| `[A-Za-z]{2}`, length 2 | `country_code`, `recording_location` |
| enum `add`/`update`/`full-update`/`meta-update`/`delete` | `action` |
| enum `None`/`none`/`Clean`/`clean`/`Explicit`/`explicit` | `advisory` |
| enum of 20 format strings incl. `DJ Mix`/`dj mix` | `release_format` |
| enum `integer`/`float`/`boolean`/`date`/`string`/`data` | `attr/type` |
| non-negative integer | `disc_number`, `track_number`, `track_length`, `bpm`, `preview_start`, `preview_duration` |
| required | `title`, `display_artist`, `action`, `schema_id`, ≥1 `track`; `track/track_number`, `track/title`, `track/display_artist`; `label/name`; `participant/role`, `participant/name`; `genre/primary`; `permission/type` (≥1), `permission/enabled`; `price_tier/type`, `price_tier/name`; `asset/type`, `asset/file_name`; `text/content`; `territory/country_code` (≥1); `attr/key`, `attr/value`; `proprietary_id/type`, `proprietary_id/id` |

`role`, `genre/primary`, `genre/sub`, `price_tier/name`, `asset/type` and
similar are `xs:string` in the XSD. The enums remain conveniences, not
constraints — arbitrary strings stay accepted, matching current behaviour.

---

## 6. Testing

`bun test`, in four layers.

1. **Golden files.** `Release.sample()` and a set of hand-built fixtures
   (minimal release, maximal release, unicode/CJK metadata, multi-disc,
   multi-territory) serialize to committed `.xml` files under `test/golden/`. Any output change shows
   up as a reviewable diff.
2. **XSD validation.** Every golden file is validated against
   `schemas/audiosalad_release_v3.4.xsd` using `xmllint-wasm` — real libxml2, no system
   binary, works identically on every machine and in CI. This replaces
   `validate-with-xmllint`, which shells out to whatever `xmllint` happens to be
   on `PATH`.
3. **Round-trip properties.** `fast-check` generates arbitrary valid
   `ReleaseInput`s and asserts `build(parse(build(x))) === build(x)`, plus that
   every generated document passes XSD validation.
4. **Regression tests.** One named, explicit test per defect in §1 — including
   an `artist_id` presence test, an `asset/attr` presence test, a
   `territory/permission` presence test, a `preview_start: 0` test, a U+0007
   rejection test, a local-midnight date test, and an
   `import * from 'src/index'` smoke test that would have caught defect 7.

Coverage is reported but not gated in the first pass; a threshold can be added
once the baseline is known.

---

## 7. Tooling

| Concern | Choice | Replaces |
|---|---|---|
| Package manager | **bun** (`packageManager` pinned, `bun.lock` committed) | yarn |
| Build | **tsdown** — dual ESM/CJS, `.d.ts`, `exports` map | tsdx (abandoned) |
| Lint + format | **Biome 2** | eslint 7 + airbnb-typescript + prettier |
| Test | **bun test** | tsdx test (jest 25) |
| XSD validation | **xmllint-wasm** | validate-with-xmllint |
| Property testing | **fast-check** | — |
| Package health | **publint** + **@arethetypeswrong/cli** | — |
| Bundle size guard | first-party script (build → gzip → assert) | size-limit |
| Git hooks | **lefthook** | husky 5 |
| Commit lint | **commitlint** + `config-conventional` | — |
| Release | **changesets** | manual |
| API docs | **typedoc** (output no longer committed) | typedoc (output committed) |

Runtime `dependencies` becomes `{}`. `xml-escape`, `@types/xml-escape`, and
`xml-formatter` are all removed.

### 7.1 Package manifest

```jsonc
{
  "name": "@ssh/audiosalad-xml",
  "version": "1.0.0",
  "type": "module",
  "packageManager": "bun@1.3.14",
  "engines": { "node": ">=20" },
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "dependencies": {}
}
```

`src` is dropped from `files`; source maps ship instead. Node 18 is
end-of-life, so `engines` moves to `>=20`.

### 7.2 CI

All jobs `runs-on: namespace-profile-default`.

**`.github/workflows/ci.yml`** — on `push` and `pull_request`:

- `check` — `biome ci` + `tsc --noEmit`
- `test` — `bun test --coverage`
- `build` — `tsdown`, then `publint` and `attw --pack`, then the size guard
- `commitlint` — pull requests only; validates every commit in the PR range

**`.github/workflows/release.yml`** — on `push` to `main`:

- `changesets/action@v1` with
  `commit: "chore(release): version packages"` and the same string as `title`,
  so the automated release commit is itself conventional.
- Publish step runs `npm publish --provenance --access public`. Bun is the
  package manager, but npm's CLI is what implements provenance attestation.
  Requires `permissions: { id-token: write, contents: write, pull-requests: write }`
  and an `NPM_TOKEN` secret.

**`.github/workflows/docs.yml`** — on `push` to `main`: typedoc → deploy to
GitHub Pages.

The existing `size.yml` (size-limit action) is deleted; `main.yml` is replaced by
`ci.yml`.

### 7.3 Conventional commits

Enforced at three points, so nothing lands non-conforming:

1. `lefthook` `commit-msg` hook → `commitlint --edit`
2. CI job validating every commit in a PR
3. The changesets action's `commit`/`title` inputs, so the bot's own release
   commit conforms

`@changesets/changelog-github` generates the changelog with PR and author links.

### 7.4 Manual steps (flagged, not performed)

Three things require repository-owner action and will be documented rather than
attempted:

1. Add the `NPM_TOKEN` repository secret.
2. Set GitHub Pages source to "GitHub Actions" (currently serving `main/docs`).
3. npm provenance requires a public repository; confirm before enabling.

---

## 8. Repository hygiene

- `git rm -r --cached dist/` — build output is currently tracked; add to
  `.gitignore`.
- `git rm -r --cached .idea/` — IDE config is currently tracked; add to
  `.gitignore`.
- Remove the generated typedoc output from `docs/` (`index.html`,
  `modules.html`, `assets/`, `classes/`, `enums/`). Typedoc now writes to
  `api-docs/`, which is gitignored and deployed by CI. **`docs/superpowers/` is
  retained** — it holds this document.
- Add `.editorconfig`.
- Add Dependabot config for `github-actions` and `npm` ecosystems.
- Delete `yarn.lock`; commit `bun.lock`.
- Move the XSD to `schemas/audiosalad_release_v3.4.xsd` at the repo root (named
  `schemas/`, not `spec/`, to avoid confusion with `src/spec/`), retaining
  `schemas/audiosalad_xsd_v3-2.xsd` for reference in the migration guide.

---

## 9. Documentation

**`README.md`** — rewritten: install with bun/npm, 30-second quickstart,
validation, parsing, the full options reference, a v3.2 → v3.4 spec-change
summary, and a **0.1.x → 1.0 migration guide** built from §4.2.

**`AGENTS.md`** — for coding agents and new contributors. Covers the repo map,
the descriptor-table invariant (*element order lives in exactly one place; never
hand-write XML*), the recipe for adding a spec field, the command list, testing
conventions, commit and release conventions, and a "known traps" section
recording the `forEach`/`??` pattern, the falsy-zero pattern, and the UTC date
pattern that produced defects 1–6.

**`CLAUDE.md`** — a symlink to `AGENTS.md`.

**API docs** — typedoc, deployed to
`slingshot.github.io/audiosalad-xml` by workflow rather than by commit.

---

## 10. Acceptance criteria

1. `bun install && bun run build && bun test` passes from a clean checkout.
2. `import * as m from '@ssh/audiosalad-xml'` loads under Bun, Node ESM, and
   Node CJS. (Defect 7 currently makes this impossible.)
3. Every golden fixture validates against `audiosalad_release_v3.4.xsd`.
4. All eight defects in §1 have a named failing-before/passing-after test.
5. `publint` and `attw --pack` report no problems.
6. Runtime `dependencies` is `{}`.
7. `commitlint` passes over the full branch history of the change.
8. A changeset exists describing the 1.0.0 major.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| A first-party XML parser is a real surface with real edge cases | Scope it to what AudioSalad emits; fuzz it with `fast-check`; cross-check parsed output against `xmllint-wasm`-validated fixtures |
| `xmllint-wasm` behaviour under `bun test` is unverified | Verified in a spike before the suite is built on it; fall back to Vitest for that layer if Bun's WASM loading misbehaves |
| Descriptor kernel could drift toward unreadable generics | Input interfaces stay hand-written; a shape-agreement test keeps table and interface in sync |
| Dropping `Delivery` breaks consumers still on v3.2 endpoints | Documented prominently; `0.1.x` remains installable |
| Provenance publishing requires a public repo | Flagged as a manual precondition; publish works without it |
