# audiosalad-xml 1.0 Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `@ssh/audiosalad-xml` as a zero-dependency, schema-first library that builds, validates, and parses AudioSalad release XML against spec v3.4, on a modern Bun toolchain with automated conventional releases.

**Architecture:** One ordered *field-descriptor table* per XSD complexType is the single source of truth for element order, cardinality, and facets. Two functions consume each table — `buildNode` (format + collect issues) and `parseNode` (invert) — so build, validate, and parse cannot disagree about the schema. A thin class facade preserves the 0.1.x API.

**Tech Stack:** Bun 1.3, TypeScript 5, tsdown (Rolldown), Biome 2, `bun test`, xmllint-wasm, fast-check, changesets, lefthook, commitlint.

**Spec:** `docs/superpowers/specs/2026-08-31-audiosalad-xml-revamp-design.md`

## Global Constraints

- Runtime `dependencies` MUST stay `{}`. Everything else is a `devDependency`.
- Target schema is **v3.4 only**: namespace and `schema_id` are both the literal `audiosalad_release_v3.4`. v3.2 is not a supported output.
- `engines.node` is `>=20`. `packageManager` is `bun@1.3.14`.
- Package is `"type": "module"` with dual ESM/CJS output via tsdown.
- Every commit message MUST be conventional (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, `ci:`, `build:`).
- Type-only exports MUST use `export type` — a bare `export { SomeType }` breaks Bun and every modern bundler (this is defect 7).
- Presence is always `value !== undefined`, **never** truthiness — a `0` is a value (this is defect 4).
- Repeated children are always produced by the descriptor kernel, **never** by hand-written `.map()`/`.forEach()` in a type module (defects 1–3).
- All `Date` values serialize in **UTC**, always.

## Defect index (referenced by task)

| # | Defect | Fixed in |
|---|---|---|
| 1 | `Participant.artistID` never emitted (`forEach`) | Task 8 |
| 2 | `Asset.attr` never emitted (`forEach`) | Task 8 |
| 3 | `Territory.permissions` never emitted (`forEach`) | Task 8 |
| 4 | Falsy guard drops legitimate `0` | Task 5 |
| 5 | XML-illegal control chars emitted unescaped | Task 2 |
| 6 | `toISOString().split('T')[0]` shifts local dates | Task 3 |
| 7 | `export { AudioSaladXML }` (a type) breaks bundlers | Task 1 |
| 8 | Test suite asserts nothing | Task 1 |

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/core/node.ts` | `XmlElement` tree model + `el()` / `leaf()` constructors |
| `src/core/serialize.ts` | Single-pass serializer, XML escaping, illegal-char policy |
| `src/core/parse.ts` | First-party XML tokenizer → `XmlElement` |
| `src/core/issues.ts` | `Issue`, `IssueCode`, `AudioSaladValidationError` |
| `src/core/datetime.ts` | `xs:date` / `xs:dateTime` / `xs:gYear` / `partial_date` formatting |
| `src/core/descriptor.ts` | The kernel: `FieldDescriptor`, `ComplexType`, `buildNode`, `parseNode` |
| `src/spec/v3_4/facets.ts` | Shared simple-type facets (ISRC, ISWC, UPC, country, enums) |
| `src/spec/v3_4/*.ts` | One descriptor table per complexType |
| `src/model/*.ts` | Hand-written input interfaces |
| `src/enums/*.ts` | Country, Genre, ParticipantRole, ReleaseFormat, PriceTier, Text, Action, Attr |
| `src/api.ts` | `buildRelease` / `validateRelease` / `parseRelease` |
| `src/legacy/classes.ts` | Facade classes preserving the 0.1.x surface |
| `src/index.ts` | Public barrel |
| `schemas/` | `audiosalad_release_v3.4.xsd` (+ v3.2 for reference) |
| `test/` | Unit, golden, property, and regression suites |

---

## Task 1: Toolchain bootstrap

Nothing in this repo can currently be run by a modern tool: `src/index.ts` fails to load under Bun (defect 7), and the test suite asserts nothing (defect 8). This task makes `bun test` meaningful before any logic changes.

**Files:**
- Create: `tsdown.config.ts`, `biome.json`, `.editorconfig`, `test/smoke.test.ts`
- Modify: `package.json`, `tsconfig.json`, `src/index.ts`, `.gitignore`
- Delete: `yarn.lock`, `.eslintrc.js`, `test/xml.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: working `bun run build`, `bun run check`, `bun test`. All later tasks assume these exist.

- [ ] **Step 1: Remove the dead toolchain and untrack build output**

```bash
git rm -q -r --cached dist .idea
git rm -q yarn.lock .eslintrc.js test/xml.test.ts
rm -rf dist node_modules
mkdir -p schemas
git mv test/audiosalad_xsd_v3-2.xsd schemas/audiosalad_xsd_v3-2.xsd
curl -fsSL https://audiosalad-xsd.s3.amazonaws.com/audiosalad_release_v3.4.xsd \
  -o schemas/audiosalad_release_v3.4.xsd
```

Append to `.gitignore`:

```gitignore
# Build output
dist/
api-docs/
*.tsbuildinfo

# IDE
.idea/
.vscode/

# Bun
.bun/
```

- [ ] **Step 2: Replace `package.json`**

```json
{
  "name": "@ssh/audiosalad-xml",
  "version": "1.0.0",
  "description": "Build, validate, and parse AudioSalad release XML (spec v3.4) from TypeScript.",
  "license": "MIT",
  "author": "Sanil Chawla",
  "homepage": "https://slingshot.github.io/audiosalad-xml",
  "repository": "github:slingshot/audiosalad-xml",
  "type": "module",
  "packageManager": "bun@1.3.14",
  "engines": { "node": ">=20" },
  "sideEffects": false,
  "publishConfig": { "access": "public", "provenance": true },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "keywords": ["audiosalad", "xml", "music", "metadata", "distribution", "ddex"],
  "scripts": {
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "check": "bun run lint && bun run typecheck && bun test",
    "size": "bun run scripts/size.ts",
    "check:exports": "publint --strict && attw --pack .",
    "docs": "typedoc",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "bun run build && npm publish"
  },
  "dependencies": {},
  "devDependencies": {
    "@arethetypeswrong/cli": "^0.18.5",
    "@biomejs/biome": "^2.5.11",
    "@changesets/changelog-github": "^0.5.1",
    "@changesets/cli": "^3.0.1",
    "@commitlint/cli": "^21.2.2",
    "@commitlint/config-conventional": "^21.2.2",
    "@types/bun": "latest",
    "fast-check": "^4.9.0",
    "lefthook": "^2.1.12",
    "publint": "^0.3.24",
    "tsdown": "^0.22.14",
    "typedoc": "^0.28.20",
    "typescript": "^5.9.0",
    "xmllint-wasm": "^5.3.0"
  }
}
```

> `release` runs plain `npm publish` — `publishConfig.provenance` supplies the attestation flag, and npm's CLI is what implements provenance. Bun remains the package manager.

- [ ] **Step 3: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "Preserve",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src", "test", "scripts", "*.ts"]
}
```

> `verbatimModuleSyntax: true` is what turns defect 7 into a compile error instead of a runtime crash.

- [ ] **Step 4: Create `tsdown.config.ts`**

```ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

- [ ] **Step 5: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.11/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!dist/**", "!api-docs/**", "!schemas/**"] },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 4,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "useConst": "error", "noNonNullAssertion": "warn" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  }
}
```

- [ ] **Step 6: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.{json,yml,yaml,md}]
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 7: Write the failing smoke test (covers defect 7 and defect 8)**

`test/smoke.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';

describe('module loading', () => {
    test('the public barrel loads without a value/type export error', async () => {
        const mod = await import('../src/index');
        expect(mod).toBeDefined();
    });

    test('every named export is defined', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        const names = Object.keys(mod).filter((k) => k !== 'default');
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(mod[name]).toBeDefined();
        }
    });
});
```

- [ ] **Step 8: Install and run the test to verify it fails**

```bash
bun install
bun test test/smoke.test.ts
```

Expected: FAIL — `SyntaxError: export 'AudioSaladXML' not found in './types/AudioSaladXML'`.

- [ ] **Step 9: Fix the type-only export in `src/index.ts`**

Split the barrel's value and type exports. Replace the single `export { ... }` block at the bottom of `src/index.ts` so that `AudioSaladXML` is exported as a type:

```ts
export type { AudioSaladXML } from './types/AudioSaladXML';

export {
    Release, Track, Action, Asset, Attr,
    CountryCode, CountryName, Delivery, Genre, SubGenre, GenreType,
    Label, Participant, ParticipantRole, Permission, PriceTier, iTunesPriceTier,
    ProprietaryID, ReleaseFormat, Territory, Text, ReleaseTextType, TrackTextType,
};
```

Also remove `import { AudioSaladXML } from './types/AudioSaladXML';` from the import block at the top — it is now re-exported directly.

- [ ] **Step 10: Run the tests to verify they pass**

```bash
bun test test/smoke.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 11: Verify build, lint, and typecheck**

```bash
bun run lint:fix
bun run build
ls dist/
```

Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, `dist/index.d.cts` present.

> `bun run typecheck` will report errors in the legacy `src/types/*.ts` files under the stricter config (notably `noUncheckedIndexedAccess`). Those files are deleted in Task 11. Until then, run `bun run lint` and `bun test` as the gate, not `bun run check`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "build: migrate to bun, tsdown, and biome

Replaces the abandoned tsdx/eslint-7 toolchain. Fixes the type-only
re-export of AudioSaladXML, which made src/index.ts unloadable under
every modern bundler, and replaces a test suite that asserted nothing."
```

---

## Task 2: XML node model, serializer, and escaping

**Files:**
- Create: `src/core/node.ts`, `src/core/issues.ts`, `src/core/serialize.ts`, `test/core/serialize.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface XmlElement { name: string; attrs: ReadonlyArray<readonly [string, string]>; children: readonly XmlElement[]; text?: string }`
  - `el(name, children, attrs?): XmlElement`, `leaf(name, text): XmlElement`
  - `serialize(root: XmlElement, opts?: SerializeOptions): string`
  - `interface SerializeOptions { indent?: string | false; xmlDeclaration?: boolean }`
  - `escapeText(s: string): string`, `findIllegalChar(s: string): string | undefined`
  - `type IssueCode`, `interface Issue`, `class AudioSaladValidationError`

- [ ] **Step 1: Write the failing tests**

`test/core/serialize.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { el, leaf } from '../../src/core/node';
import { escapeText, findIllegalChar, serialize } from '../../src/core/serialize';

describe('escapeText', () => {
    test('escapes the five predefined entities', () => {
        expect(escapeText(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
    });

    test('leaves tab, newline, and carriage return alone', () => {
        expect(escapeText('a\tb\nc\rd')).toBe('a\tb\nc\rd');
    });
});

describe('findIllegalChar', () => {
    // Defect 5: xml-escape passed these straight through, producing documents
    // that no conformant parser will accept.
    test('detects a C0 control character', () => {
        expect(findIllegalChar(`Bad${String.fromCharCode(7)}Title`)).toBe('');
    });

    test('detects a lone surrogate', () => {
        expect(findIllegalChar(`x${String.fromCharCode(0xd800)}y`)).toBe('\ud800');
    });

    test('accepts astral plane characters', () => {
        expect(findIllegalChar('emoji \u{1F3B5} ok')).toBeUndefined();
    });

    test('accepts CJK and accented text', () => {
        expect(findIllegalChar('椎名林檎 — Café')).toBeUndefined();
    });
});

describe('serialize', () => {
    test('emits an XML declaration by default', () => {
        expect(serialize(leaf('a', 'x'))).toStartWith('<?xml version="1.0" encoding="UTF-8"?>\n');
    });

    test('omits the declaration when asked', () => {
        expect(serialize(leaf('a', 'x'), { xmlDeclaration: false })).toBe('<a>x</a>');
    });

    test('indents nested elements with four spaces', () => {
        const tree = el('root', [leaf('a', '1'), el('b', [leaf('c', '2')])]);
        expect(serialize(tree, { xmlDeclaration: false })).toBe(
            ['<root>', '    <a>1</a>', '    <b>', '        <c>2</c>', '    </b>', '</root>'].join('\n'),
        );
    });

    test('emits attributes in insertion order', () => {
        const tree = el('r', [], [['xmlns', 'ns'], ['b', '2']]);
        expect(serialize(tree, { xmlDeclaration: false })).toBe('<r xmlns="ns" b="2"/>');
    });

    test('preserves multi-line leaf content verbatim', () => {
        // The old pipeline set collapseContent: true, which mangled lyrics.
        const tree = el('t', [leaf('content', 'line one\nline two')]);
        expect(serialize(tree, { xmlDeclaration: false })).toContain('line one\nline two');
    });

    test('escapes leaf text and attribute values', () => {
        const tree = el('r', [leaf('a', 'x & y')], [['v', 'p<q']]);
        const out = serialize(tree, { xmlDeclaration: false });
        expect(out).toContain('<a>x &amp; y</a>');
        expect(out).toContain('v="p&lt;q"');
    });

    test('self-closes empty elements', () => {
        expect(serialize(el('a', []), { xmlDeclaration: false })).toBe('<a/>');
    });

    test('uses \\n line endings', () => {
        expect(serialize(el('a', [leaf('b', '1')]), { xmlDeclaration: false })).not.toContain('\r');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/core/serialize.test.ts
```

Expected: FAIL — `Cannot find module '../../src/core/node'`.

- [ ] **Step 3: Implement `src/core/node.ts`**

```ts
/** An XML element. A node has either element children or text, never both. */
export interface XmlElement {
    readonly name: string;
    readonly attrs: ReadonlyArray<readonly [string, string]>;
    readonly children: readonly XmlElement[];
    readonly text?: string;
}

/** Build an element with element children. */
export const el = (
    name: string,
    children: readonly XmlElement[],
    attrs: ReadonlyArray<readonly [string, string]> = [],
): XmlElement => ({ name, attrs, children });

/** Build a leaf element carrying text content. */
export const leaf = (name: string, text: string): XmlElement => ({
    name,
    attrs: [],
    children: [],
    text,
});
```

- [ ] **Step 4: Implement `src/core/issues.ts`**

```ts
export type IssueCode =
    | 'required'
    | 'pattern'
    | 'minLength'
    | 'maxLength'
    | 'enum'
    | 'type'
    | 'cardinality'
    | 'illegalChar'
    | 'unknownElement';

/** A single validation problem, addressed by a path into the *input* object. */
export interface Issue {
    /** e.g. `tracks[0].isrc` — the shape the caller wrote, not the XML shape. */
    readonly path: string;
    readonly code: IssueCode;
    readonly message: string;
}

/** Thrown by `buildRelease` and `parseRelease`; carries every issue, not just the first. */
export class AudioSaladValidationError extends Error {
    readonly issues: readonly Issue[];

    constructor(issues: readonly Issue[]) {
        const head = issues
            .slice(0, 5)
            .map((i) => `  ${i.path}: ${i.message}`)
            .join('\n');
        const more = issues.length > 5 ? `\n  …and ${issues.length - 5} more` : '';
        super(`AudioSalad XML validation failed with ${issues.length} issue(s):\n${head}${more}`);
        this.name = 'AudioSaladValidationError';
        this.issues = issues;
    }
}

export const issue = (path: string, code: IssueCode, message: string): Issue => ({
    path,
    code,
    message,
});
```

- [ ] **Step 5: Implement `src/core/serialize.ts`**

```ts
import type { XmlElement } from './node';

export interface SerializeOptions {
    /** Indent string, or false for a single line. Default four spaces. */
    indent?: string | false;
    /** Emit `<?xml version="1.0" encoding="UTF-8"?>`. Default true. */
    xmlDeclaration?: boolean;
}

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

/**
 * Characters XML 1.0 permits are #x9 | #xA | #xD | [#x20-#xD7FF] |
 * [#xE000-#xFFFD] | [#x10000-#x10FFFF]. Anything else — C0 controls, lone
 * surrogates — cannot be represented even as a character reference. The `u`
 * flag makes this iterate by code point, so astral characters pass.
 */
const ILLEGAL_XML_CHAR =
    /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u;

/** Returns the first XML-illegal character in `s`, or undefined if there is none. */
export const findIllegalChar = (s: string): string | undefined =>
    ILLEGAL_XML_CHAR.exec(s)?.[0];

/** Escapes the five predefined entities. Assumes `s` holds no illegal characters. */
export const escapeText = (s: string): string =>
    s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');

const writeElement = (
    node: XmlElement,
    indent: string | false,
    depth: number,
    out: string[],
): void => {
    const pad = indent === false ? '' : indent.repeat(depth);
    const attrs = node.attrs
        .map(([k, v]) => ` ${k}="${escapeText(v)}"`)
        .join('');

    if (node.text !== undefined) {
        out.push(`${pad}<${node.name}${attrs}>${escapeText(node.text)}</${node.name}>`);
        return;
    }
    if (node.children.length === 0) {
        out.push(`${pad}<${node.name}${attrs}/>`);
        return;
    }
    out.push(`${pad}<${node.name}${attrs}>`);
    for (const child of node.children) {
        writeElement(child, indent, depth + 1, out);
    }
    out.push(`${pad}</${node.name}>`);
};

/**
 * Serializes a finished tree in one pass. The 0.1.x pipeline called a
 * formatter at every nesting level, re-parsing the whole subtree each time.
 */
export const serialize = (root: XmlElement, opts: SerializeOptions = {}): string => {
    const indent = opts.indent ?? '    ';
    const out: string[] = [];
    writeElement(root, indent, 0, out);
    const body = indent === false ? out.join('') : out.join('\n');
    return opts.xmlDeclaration === false ? body : `${XML_DECLARATION}\n${body}`;
};
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun test test/core/serialize.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 7: Commit**

```bash
git add src/core test/core
git commit -m "feat(core): add XML node model and single-pass serializer

Escaping now detects XML-illegal control characters and lone surrogates,
which xml-escape passed through unchanged. Leaf text is emitted verbatim
rather than collapsed."
```

---

## Task 3: Date and time formatting

**Files:**
- Create: `src/core/datetime.ts`, `test/core/datetime.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (each returns `undefined` when the input cannot be represented, so the kernel can raise a `type` issue rather than throw):
  - `type DateLike = Date | string`
  - `formatDate(v: DateLike): string | undefined` → `YYYY-MM-DD`
  - `formatDateTime(v: DateLike): string | undefined` → `YYYY-MM-DDTHH:MM:SSZ`
  - `formatGYear(v: DateLike | number): string | undefined` → `YYYY`
  - `formatPartialDate(v: DateLike): string | undefined` → `YYYY` | `YYYY-MM` | `YYYY-MM-DD`

- [ ] **Step 1: Write the failing tests**

`test/core/datetime.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
    formatDate,
    formatDateTime,
    formatGYear,
    formatPartialDate,
} from '../../src/core/datetime';

describe('formatDate', () => {
    test('formats a Date in UTC', () => {
        expect(formatDate(new Date(Date.UTC(2020, 4, 2)))).toBe('2020-05-02');
    });

    // Defect 6: `toISOString().split('T')[0]` on a Date built from a
    // local-time string converts through UTC and can shift the day.
    test('is explicit about UTC for a late local time', () => {
        const d = new Date(Date.UTC(2020, 4, 2, 23, 30));
        expect(formatDate(d)).toBe('2020-05-02');
    });

    test('passes through a valid YYYY-MM-DD string', () => {
        expect(formatDate('2020-05-02')).toBe('2020-05-02');
    });

    test('rejects a malformed string', () => {
        expect(formatDate('2020/05/02')).toBeUndefined();
        expect(formatDate('2020-13-02')).toBeUndefined();
    });

    test('rejects an invalid Date', () => {
        expect(formatDate(new Date('nope'))).toBeUndefined();
    });
});

describe('formatDateTime', () => {
    test('formats in UTC with no fractional seconds', () => {
        expect(formatDateTime(new Date(Date.UTC(2020, 4, 2, 21, 0, 0)))).toBe(
            '2020-05-02T21:00:00Z',
        );
    });

    test('passes through a valid dateTime string', () => {
        expect(formatDateTime('2017-01-01T00:00:00Z')).toBe('2017-01-01T00:00:00Z');
    });

    test('accepts an offset-bearing string', () => {
        expect(formatDateTime('2017-01-01T00:00:00+02:00')).toBe('2017-01-01T00:00:00+02:00');
    });

    test('rejects a bare date string', () => {
        expect(formatDateTime('2017-01-01')).toBeUndefined();
    });
});

describe('formatGYear', () => {
    test('accepts a number', () => {
        expect(formatGYear(2020)).toBe('2020');
    });

    test('accepts a four-digit string', () => {
        expect(formatGYear('2020')).toBe('2020');
    });

    test('takes the UTC year from a Date', () => {
        expect(formatGYear(new Date(Date.UTC(2020, 0, 1)))).toBe('2020');
    });

    test('rejects a two-digit year', () => {
        expect(formatGYear(20)).toBeUndefined();
    });
});

describe('formatPartialDate', () => {
    test('accepts a full date', () => {
        expect(formatPartialDate('2020-05-02')).toBe('2020-05-02');
    });

    test('accepts a year and month', () => {
        expect(formatPartialDate('2020-05')).toBe('2020-05');
    });

    test('accepts a bare year', () => {
        expect(formatPartialDate('2020')).toBe('2020');
    });

    test('formats a Date as a full date', () => {
        expect(formatPartialDate(new Date(Date.UTC(2020, 4, 2)))).toBe('2020-05-02');
    });

    test('rejects a malformed value', () => {
        expect(formatPartialDate('May 2020')).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/core/datetime.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/datetime.ts`**

```ts
/** Any value accepted where the schema wants a date or dateTime. */
export type DateLike = Date | string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;
const YEAR_RE = /^\d{4}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const isValidDate = (d: Date): boolean => !Number.isNaN(d.getTime());

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** True when the calendar fields in a YYYY-MM-DD string denote a real day. */
const isRealDate = (s: string): boolean => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    const probe = new Date(Date.UTC(y, m - 1, d));
    return (
        probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
    );
};

/** `xs:date` — always rendered from the Date's **UTC** fields. */
export const formatDate = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        return DATE_RE.test(v) && isRealDate(v) ? v : undefined;
    }
    if (!isValidDate(v)) return undefined;
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
};

/** `xs:dateTime` — UTC, no fractional seconds, matching AudioSalad's examples. */
export const formatDateTime = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        return DATETIME_RE.test(v) ? v : undefined;
    }
    if (!isValidDate(v)) return undefined;
    const date = `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
    const time = `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`;
    return `${date}T${time}Z`;
};

/** `xs:gYear` — a four-digit year. */
export const formatGYear = (v: DateLike | number): string | undefined => {
    if (typeof v === 'number') {
        return Number.isInteger(v) && v >= 1000 && v <= 9999 ? String(v) : undefined;
    }
    if (typeof v === 'string') {
        return YEAR_RE.test(v) ? v : undefined;
    }
    if (!isValidDate(v)) return undefined;
    return String(v.getUTCFullYear());
};

/** `partial_date` — the union of `xs:date`, `xs:gYearMonth`, and `xs:gYear`. */
export const formatPartialDate = (v: DateLike): string | undefined => {
    if (typeof v === 'string') {
        if (YEAR_RE.test(v) || YEAR_MONTH_RE.test(v)) return v;
        return DATE_RE.test(v) && isRealDate(v) ? v : undefined;
    }
    return formatDate(v);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test test/core/datetime.test.ts
```

Expected: PASS, 17 tests.

- [ ] **Step 5: Commit**

```bash
git add src/core/datetime.ts test/core/datetime.test.ts
git commit -m "feat(core): add UTC-explicit date and time formatters

Replaces toISOString().split('T')[0], which converted through UTC
implicitly and could shift a local-time date by a day."
```

---

## Task 4: XML parser

A first-party tokenizer keeps the package at zero runtime dependencies. Scope is deliberately narrow: what AudioSalad emits, plus enough robustness to reject garbage loudly.

**Files:**
- Create: `src/core/parse.ts`, `test/core/parse.test.ts`

**Interfaces:**
- Consumes: `XmlElement` from `src/core/node.ts` (Task 2).
- Produces: `parseXml(source: string): XmlElement` — returns the root element; throws `SyntaxError` on malformed input.

- [ ] **Step 1: Write the failing tests**

`test/core/parse.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { parseXml } from '../../src/core/parse';

describe('parseXml', () => {
    test('parses a leaf element', () => {
        const r = parseXml('<a>hello</a>');
        expect(r.name).toBe('a');
        expect(r.text).toBe('hello');
    });

    test('parses nested elements', () => {
        const r = parseXml('<a><b>1</b><c>2</c></a>');
        expect(r.children.map((c) => c.name)).toEqual(['b', 'c']);
        expect(r.children[0]?.text).toBe('1');
    });

    test('parses attributes', () => {
        const r = parseXml('<a x="1" y=\'2\'/>');
        expect(r.attrs).toEqual([['x', '1'], ['y', '2']]);
    });

    test('handles self-closing elements', () => {
        const r = parseXml('<a><b/></a>');
        expect(r.children[0]?.name).toBe('b');
        expect(r.children[0]?.children).toEqual([]);
    });

    test('skips the XML declaration, comments, and processing instructions', () => {
        const r = parseXml('<?xml version="1.0"?><!-- hi --><?pi go?><a>x</a>');
        expect(r.name).toBe('a');
        expect(r.text).toBe('x');
    });

    test('decodes the five predefined entities', () => {
        expect(parseXml('<a>&amp;&lt;&gt;&quot;&apos;</a>').text).toBe(`&<>"'`);
    });

    test('decodes decimal and hex character references', () => {
        expect(parseXml('<a>&#65;&#x42;</a>').text).toBe('AB');
    });

    test('decodes astral character references', () => {
        expect(parseXml('<a>&#x1F3B5;</a>').text).toBe('\u{1F3B5}');
    });

    test('reads CDATA verbatim', () => {
        expect(parseXml('<a><![CDATA[x < y & z]]></a>').text).toBe('x < y & z');
    });

    test('preserves newlines in leaf text', () => {
        expect(parseXml('<a>one\ntwo</a>').text).toBe('one\ntwo');
    });

    test('drops whitespace between element children', () => {
        const r = parseXml('<a>\n    <b>1</b>\n</a>');
        expect(r.children).toHaveLength(1);
        expect(r.text).toBeUndefined();
    });

    test('strips namespace prefixes', () => {
        const r = parseXml('<ns:a xmlns:ns="u"><ns:b>1</ns:b></ns:a>');
        expect(r.name).toBe('a');
        expect(r.children[0]?.name).toBe('b');
    });

    test('throws on a mismatched closing tag', () => {
        expect(() => parseXml('<a><b></c></a>')).toThrow(SyntaxError);
    });

    test('throws on an unclosed element', () => {
        expect(() => parseXml('<a><b></a>')).toThrow(SyntaxError);
    });

    test('throws when there is no root element', () => {
        expect(() => parseXml('   ')).toThrow(SyntaxError);
    });

    test('throws on trailing content after the root', () => {
        expect(() => parseXml('<a/><b/>')).toThrow(SyntaxError);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/core/parse.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/parse.ts`**

```ts
import type { XmlElement } from './node';

const ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
};

const decodeEntities = (s: string): string =>
    s.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
        if (body.startsWith('#x')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
        if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
        return ENTITIES[body] ?? whole;
    });

/** AudioSalad uses a single default namespace; prefixes carry no information here. */
const stripPrefix = (name: string): string => {
    const i = name.indexOf(':');
    return i === -1 ? name : name.slice(i + 1);
};

interface Frame {
    name: string;
    attrs: Array<readonly [string, string]>;
    children: XmlElement[];
    text: string;
}

/**
 * Parses AudioSalad-shaped XML into an element tree. Supports elements,
 * attributes, text, CDATA, comments, processing instructions, the five
 * predefined entities, and numeric character references.
 *
 * @throws {SyntaxError} when the document is malformed.
 */
export const parseXml = (source: string): XmlElement => {
    const stack: Frame[] = [];
    let root: XmlElement | undefined;
    let i = 0;

    const fail = (msg: string): never => {
        throw new SyntaxError(`${msg} at offset ${i}`);
    };

    const finish = (frame: Frame): XmlElement => {
        // An element has children or text, never both. Whitespace-only text
        // beside element children is layout, not content.
        const text = frame.children.length > 0 ? undefined : decodeEntities(frame.text);
        const node: XmlElement =
            text === undefined
                ? { name: frame.name, attrs: frame.attrs, children: frame.children }
                : { name: frame.name, attrs: frame.attrs, children: [], text };
        const parent = stack[stack.length - 1];
        if (parent) parent.children.push(node);
        else if (root) fail('multiple root elements');
        else root = node;
        return node;
    };

    while (i < source.length) {
        const lt = source.indexOf('<', i);
        if (lt === -1) {
            if (stack.length > 0) stack[stack.length - 1]!.text += source.slice(i);
            break;
        }
        if (lt > i) {
            const chunk = source.slice(i, lt);
            const top = stack[stack.length - 1];
            if (top) top.text += chunk;
            else if (chunk.trim() !== '') fail('text outside the root element');
        }
        i = lt;

        if (source.startsWith('<!--', i)) {
            const end = source.indexOf('-->', i);
            if (end === -1) fail('unterminated comment');
            i = end + 3;
            continue;
        }
        if (source.startsWith('<![CDATA[', i)) {
            const end = source.indexOf(']]>', i);
            if (end === -1) fail('unterminated CDATA section');
            const top = stack[stack.length - 1];
            if (!top) fail('CDATA outside the root element');
            // CDATA is verbatim, so it must bypass entity decoding. Re-escaping
            // the ampersands keeps decodeEntities idempotent over the whole run.
            top.text += source.slice(i + 9, end).replaceAll('&', '&amp;');
            i = end + 3;
            continue;
        }
        if (source.startsWith('<?', i)) {
            const end = source.indexOf('?>', i);
            if (end === -1) fail('unterminated processing instruction');
            i = end + 2;
            continue;
        }
        if (source.startsWith('<!', i)) {
            const end = source.indexOf('>', i);
            if (end === -1) fail('unterminated declaration');
            i = end + 1;
            continue;
        }

        const gt = source.indexOf('>', i);
        if (gt === -1) fail('unterminated tag');

        if (source[i + 1] === '/') {
            const name = stripPrefix(source.slice(i + 2, gt).trim());
            const frame = stack.pop();
            if (!frame) fail(`unexpected closing tag </${name}>`);
            if (frame!.name !== name) fail(`expected </${frame!.name}> but found </${name}>`);
            finish(frame!);
            i = gt + 1;
            continue;
        }

        const selfClosing = source[gt - 1] === '/';
        const body = source.slice(i + 1, selfClosing ? gt - 1 : gt).trim();
        const spaceAt = body.search(/\s/);
        const rawName = spaceAt === -1 ? body : body.slice(0, spaceAt);
        if (rawName === '') fail('empty tag name');

        const attrs: Array<readonly [string, string]> = [];
        if (spaceAt !== -1) {
            const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
            let m: RegExpExecArray | null = attrRe.exec(body.slice(spaceAt));
            while (m !== null) {
                attrs.push([m[1]!, decodeEntities(m[3] ?? m[4] ?? '')]);
                m = attrRe.exec(body.slice(spaceAt));
            }
        }

        const frame: Frame = { name: stripPrefix(rawName), attrs, children: [], text: '' };
        if (selfClosing) finish(frame);
        else stack.push(frame);
        i = gt + 1;
    }

    if (stack.length > 0) throw new SyntaxError(`unclosed element <${stack[stack.length - 1]!.name}>`);
    if (!root) throw new SyntaxError('no root element found');
    return root;
};
```

> The attribute loop re-slices `body` on each iteration, which resets `lastIndex`. Hoist the slice into a local before the loop when implementing:
> `const attrSource = body.slice(spaceAt);` then `attrRe.exec(attrSource)` both times.

- [ ] **Step 4: Apply the attribute-loop fix noted above**

Replace the attribute block with:

```ts
        const attrs: Array<readonly [string, string]> = [];
        if (spaceAt !== -1) {
            const attrSource = body.slice(spaceAt);
            const attrRe = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
            let m: RegExpExecArray | null = attrRe.exec(attrSource);
            while (m !== null) {
                attrs.push([m[1]!, decodeEntities(m[3] ?? m[4] ?? '')]);
                m = attrRe.exec(attrSource);
            }
        }
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
bun test test/core/parse.test.ts
```

Expected: PASS, 16 tests.

- [ ] **Step 6: Commit**

```bash
git add src/core/parse.ts test/core/parse.test.ts
git commit -m "feat(core): add a dependency-free XML parser"
```

---

## Task 5: The field-descriptor kernel

The heart of the design. This task tests the kernel against a small *synthetic* schema, not the real AudioSalad tables — the kernel's correctness is independent of the spec it is later pointed at, and testing it in isolation keeps the failures legible.

**Files:**
- Create: `src/core/descriptor.ts`, `test/core/descriptor.test.ts`

**Interfaces:**
- Consumes: `XmlElement`/`el`/`leaf` (Task 2), `Issue`/`issue` (Task 2), the four formatters (Task 3), `findIllegalChar` (Task 2).
- Produces:
  - `type Kind = 'string' | 'unsignedInt' | 'boolean' | 'date' | 'dateTime' | 'gYear' | 'partialDate' | 'complex'`
  - `interface FieldDescriptor<I>` and `interface ComplexType<I>` (fields as in the spec)
  - `buildNode<I>(type: ComplexType<I>, input: I, elName: string, ctx: BuildCtx): XmlElement`
  - `parseNode<I>(type: ComplexType<I>, node: XmlElement, ctx: ParseCtx): I`
  - `interface BuildCtx { path: string; issues: Issue[]; onIllegalChars: 'error' | 'strip' }`
  - `interface ParseCtx { path: string; issues: Issue[]; onUnknownElement: 'error' | 'ignore' }`

> **Design refinement over the spec.** The spec named three consumers of the table (`buildNode`, `collectIssues`, `parseNode`). Two suffice: `buildNode` both formats *and* collects issues, so `validateRelease` is simply "build and discard the tree". One walk means validation and serialization cannot drift apart. Update the spec's §3.1 to match when this task lands.

- [ ] **Step 1: Write the failing tests**

`test/core/descriptor.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { type ComplexType, buildNode, parseNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { parseXml } from '../../src/core/parse';
import { serialize } from '../../src/core/serialize';

interface ChildInput { id: string }
interface ToyInput {
    name: string;
    count?: number;
    flag?: boolean;
    when?: Date | string;
    tags?: string[];
    kids?: ChildInput[];
    code?: string;
}

const CHILD: ComplexType<ChildInput> = {
    name: 'child_type',
    fields: [{ el: 'id', key: 'id', kind: 'string', min: 1, max: 1 }],
};

const TOY: ComplexType<ToyInput> = {
    name: 'toy_type',
    fields: [
        { el: 'schema_id', kind: 'string', min: 1, max: 1, const: 'toy_v1' },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'count', key: 'count', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'flag', key: 'flag', kind: 'boolean', min: 0, max: 1 },
        { el: 'when', key: 'when', kind: 'dateTime', min: 0, max: 1 },
        { el: 'tag', key: 'tags', kind: 'string', min: 0, max: Number.POSITIVE_INFINITY },
        { el: 'kid', key: 'kids', kind: 'complex', type: CHILD, min: 0, max: Number.POSITIVE_INFINITY },
        { el: 'code', key: 'code', kind: 'string', min: 0, max: 1, pattern: /^[A-Z]{2}$/, minLength: 2, maxLength: 2 },
    ],
};

const build = (input: ToyInput) => {
    const issues: Issue[] = [];
    const node = buildNode(TOY, input, 'toy', { path: '', issues, onIllegalChars: 'error' });
    return { xml: serialize(node, { xmlDeclaration: false }), issues };
};

describe('buildNode', () => {
    test('emits const fields without reading the input', () => {
        expect(build({ name: 'x' }).xml).toContain('<schema_id>toy_v1</schema_id>');
    });

    test('emits fields in table order regardless of input key order', () => {
        const { xml } = build({ tags: ['t'], count: 1, name: 'x' });
        expect(xml.indexOf('<name>')).toBeLessThan(xml.indexOf('<count>'));
        expect(xml.indexOf('<count>')).toBeLessThan(xml.indexOf('<tag>'));
    });

    // Defect 4: the 0.1.x code used `this.count ? ... : ''`, so a real zero vanished.
    test('emits a numeric zero', () => {
        expect(build({ name: 'x', count: 0 }).xml).toContain('<count>0</count>');
    });

    // Defect 4, boolean form: `compilation: false` was silently dropped.
    test('emits a false boolean', () => {
        expect(build({ name: 'x', flag: false }).xml).toContain('<flag>false</flag>');
    });

    test('omits absent optional fields', () => {
        expect(build({ name: 'x' }).xml).not.toContain('<count>');
    });

    // Defects 1-3: repeated children were built with forEach and vanished.
    test('emits every element of an unbounded simple field', () => {
        const { xml } = build({ name: 'x', tags: ['a', 'b', 'c'] });
        expect(xml.match(/<tag>/g)).toHaveLength(3);
    });

    test('emits every element of an unbounded complex field', () => {
        const { xml } = build({ name: 'x', kids: [{ id: '1' }, { id: '2' }] });
        expect(xml.match(/<kid>/g)).toHaveLength(2);
        expect(xml).toContain('<id>1</id>');
        expect(xml).toContain('<id>2</id>');
    });

    test('reports a missing required field', () => {
        const { issues } = build({ name: undefined as unknown as string });
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ path: 'name', code: 'required' });
    });

    test('reports a pattern violation with a path', () => {
        const { issues } = build({ name: 'x', code: 'abc' });
        expect(issues.map((i) => i.code)).toContain('pattern');
        expect(issues[0]?.path).toBe('code');
    });

    test('paths into arrays are indexed', () => {
        const { issues } = build({ name: 'x', kids: [{ id: 'ok' }, { id: undefined as unknown as string }] });
        expect(issues[0]?.path).toBe('kids[1].id');
    });

    test('reports a non-integer where unsignedInt is required', () => {
        expect(build({ name: 'x', count: 1.5 }).issues.map((i) => i.code)).toContain('type');
        expect(build({ name: 'x', count: -1 }).issues.map((i) => i.code)).toContain('type');
    });

    test('reports an unformattable date', () => {
        expect(build({ name: 'x', when: 'not-a-date' }).issues.map((i) => i.code)).toContain('type');
    });

    // Defect 5.
    test('reports an XML-illegal character', () => {
        const { issues } = build({ name: `Bad${String.fromCharCode(7)}Name` });
        expect(issues[0]).toMatchObject({ path: 'name', code: 'illegalChar' });
    });

    test('strips illegal characters when asked', () => {
        const issues: Issue[] = [];
        const node = buildNode(
            TOY,
            { name: `Bad${String.fromCharCode(7)}Name` },
            'toy',
            { path: '', issues, onIllegalChars: 'strip' },
        );
        expect(issues).toHaveLength(0);
        expect(serialize(node, { xmlDeclaration: false })).toContain('<name>BadName</name>');
    });

    test('reports too few occurrences of a required repeated field', () => {
        const REQ: ComplexType<{ kids?: ChildInput[] }> = {
            name: 'req_type',
            fields: [{ el: 'kid', key: 'kids', kind: 'complex', type: CHILD, min: 1, max: Number.POSITIVE_INFINITY }],
        };
        const issues: Issue[] = [];
        buildNode(REQ, {}, 'r', { path: '', issues, onIllegalChars: 'error' });
        expect(issues[0]).toMatchObject({ code: 'required' });
    });

    test('reports too many occurrences of a bounded field', () => {
        const { issues } = build({ name: 'x', code: 'AB' });
        expect(issues).toHaveLength(0);
    });
});

describe('parseNode', () => {
    const roundTrip = (input: ToyInput): ToyInput => {
        const issues: Issue[] = [];
        const node = buildNode(TOY, input, 'toy', { path: '', issues, onIllegalChars: 'error' });
        const xml = serialize(node, { xmlDeclaration: false });
        return parseNode(TOY, parseXml(xml), { path: '', issues, onUnknownElement: 'error' });
    };

    test('recovers scalars', () => {
        expect(roundTrip({ name: 'x', count: 7, flag: true })).toMatchObject({
            name: 'x',
            count: 7,
            flag: true,
        });
    });

    test('recovers a numeric zero', () => {
        expect(roundTrip({ name: 'x', count: 0 }).count).toBe(0);
    });

    test('recovers repeated simple fields', () => {
        expect(roundTrip({ name: 'x', tags: ['a', 'b'] }).tags).toEqual(['a', 'b']);
    });

    test('recovers repeated complex fields', () => {
        expect(roundTrip({ name: 'x', kids: [{ id: '1' }] }).kids).toEqual([{ id: '1' }]);
    });

    test('renders dates as strings after a round trip', () => {
        expect(roundTrip({ name: 'x', when: new Date(Date.UTC(2020, 0, 1)) }).when).toBe(
            '2020-01-01T00:00:00Z',
        );
    });

    test('does not surface const fields as input keys', () => {
        expect(Object.keys(roundTrip({ name: 'x' }))).not.toContain('schema_id');
    });

    test('reports an unknown element', () => {
        const issues: Issue[] = [];
        parseNode(TOY, parseXml('<toy><name>x</name><mystery>1</mystery></toy>'), {
            path: '',
            issues,
            onUnknownElement: 'error',
        });
        expect(issues[0]).toMatchObject({ code: 'unknownElement' });
    });

    test('ignores an unknown element when asked', () => {
        const issues: Issue[] = [];
        parseNode(TOY, parseXml('<toy><name>x</name><mystery>1</mystery></toy>'), {
            path: '',
            issues,
            onUnknownElement: 'ignore',
        });
        expect(issues).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/core/descriptor.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/descriptor.ts`**

```ts
import {
    type DateLike,
    formatDate,
    formatDateTime,
    formatGYear,
    formatPartialDate,
} from './datetime';
import { type Issue, issue } from './issues';
import { type XmlElement, el, leaf } from './node';
import { findIllegalChar } from './serialize';

export type Kind =
    | 'string'
    | 'unsignedInt'
    | 'boolean'
    | 'date'
    | 'dateTime'
    | 'gYear'
    | 'partialDate'
    | 'complex';

export interface FieldDescriptor<I> {
    /** XML element name. **Table order is the XSD sequence order.** */
    readonly el: string;
    /** Key on the input object. Omitted for `const` fields. */
    readonly key?: keyof I & string;
    readonly kind: Kind;
    /** minOccurs */
    readonly min: 0 | 1;
    /** maxOccurs; `Number.POSITIVE_INFINITY` for unbounded. */
    readonly max: number;
    /** Required when `kind === 'complex'`. */
    readonly type?: AnyComplexType;
    /** A fixed value emitted regardless of input, e.g. `schema_id`. */
    readonly const?: string;
    readonly pattern?: RegExp;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly values?: readonly string[];
}

export interface ComplexType<I> {
    /** XSD complexType name, used in issue messages. */
    readonly name: string;
    readonly fields: ReadonlyArray<FieldDescriptor<I>>;
}

/**
 * A table referencing a child table of an unrelated input type. `ComplexType`
 * is invariant in `I` (it appears in `keyof I`), so a precise type here would
 * force a cast at every reference site instead of one declaration.
 */
// biome-ignore lint/suspicious/noExplicitAny: see above
export type AnyComplexType = ComplexType<any>;

export interface BuildCtx {
    path: string;
    issues: Issue[];
    onIllegalChars: 'error' | 'strip';
}

export interface ParseCtx {
    path: string;
    issues: Issue[];
    onUnknownElement: 'error' | 'ignore';
}

const ILLEGAL_GLOBAL =
    /[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/gu;

const join = (base: string, key: string): string => (base === '' ? key : `${base}.${key}`);

/** Formats one scalar value, pushing an issue and returning undefined on failure. */
const formatScalar = <I>(
    f: FieldDescriptor<I>,
    raw: unknown,
    path: string,
    ctx: BuildCtx,
): string | undefined => {
    let out: string | undefined;

    switch (f.kind) {
        case 'string':
            out = typeof raw === 'string' ? raw : String(raw);
            break;
        case 'unsignedInt':
            if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
                ctx.issues.push(
                    issue(path, 'type', `expected a non-negative integer, got ${String(raw)}`),
                );
                return undefined;
            }
            out = String(raw);
            break;
        case 'boolean':
            if (typeof raw !== 'boolean') {
                ctx.issues.push(issue(path, 'type', `expected a boolean, got ${String(raw)}`));
                return undefined;
            }
            out = raw ? 'true' : 'false';
            break;
        case 'date':
            out = formatDate(raw as DateLike);
            break;
        case 'dateTime':
            out = formatDateTime(raw as DateLike);
            break;
        case 'gYear':
            out = formatGYear(raw as DateLike | number);
            break;
        case 'partialDate':
            out = formatPartialDate(raw as DateLike);
            break;
        case 'complex':
            return undefined;
    }

    if (out === undefined) {
        ctx.issues.push(issue(path, 'type', `value is not a valid ${f.kind}: ${String(raw)}`));
        return undefined;
    }

    const bad = findIllegalChar(out);
    if (bad !== undefined) {
        if (ctx.onIllegalChars === 'strip') {
            out = out.replace(ILLEGAL_GLOBAL, '');
        } else {
            const code = bad.codePointAt(0) ?? 0;
            ctx.issues.push(
                issue(
                    path,
                    'illegalChar',
                    `contains U+${code.toString(16).toUpperCase().padStart(4, '0')}, which XML cannot represent`,
                ),
            );
            return undefined;
        }
    }

    if (f.pattern && !f.pattern.test(out)) {
        ctx.issues.push(issue(path, 'pattern', `"${out}" does not match ${String(f.pattern)}`));
    }
    if (f.minLength !== undefined && out.length < f.minLength) {
        ctx.issues.push(issue(path, 'minLength', `must be at least ${f.minLength} characters`));
    }
    if (f.maxLength !== undefined && out.length > f.maxLength) {
        ctx.issues.push(issue(path, 'maxLength', `must be at most ${f.maxLength} characters`));
    }
    if (f.values && !f.values.includes(out)) {
        ctx.issues.push(issue(path, 'enum', `"${out}" is not one of: ${f.values.join(', ')}`));
    }

    return out;
};

/**
 * Walks a descriptor table in order, producing an element tree and collecting
 * every validation issue in one pass. `validateRelease` is just this function
 * with the tree thrown away, so validation and serialization cannot disagree.
 */
export const buildNode = <I>(
    type: ComplexType<I>,
    input: I,
    elName: string,
    ctx: BuildCtx,
): XmlElement => {
    const children: XmlElement[] = [];

    for (const f of type.fields) {
        if (f.const !== undefined) {
            children.push(leaf(f.el, f.const));
            continue;
        }
        if (f.key === undefined) continue;

        const raw = (input as Record<string, unknown>)[f.key];
        const fieldPath = join(ctx.path, f.key);
        const repeated = f.max > 1;

        if (raw === undefined || raw === null) {
            if (f.min === 1) {
                ctx.issues.push(issue(fieldPath, 'required', `${f.el} is required`));
            }
            continue;
        }

        const values = repeated ? (Array.isArray(raw) ? raw : [raw]) : [raw];

        if (repeated && f.min === 1 && values.length === 0) {
            ctx.issues.push(issue(fieldPath, 'required', `at least one ${f.el} is required`));
            continue;
        }
        if (!repeated && Array.isArray(raw)) {
            ctx.issues.push(issue(fieldPath, 'cardinality', `${f.el} accepts a single value`));
            continue;
        }
        if (values.length > f.max) {
            ctx.issues.push(
                issue(fieldPath, 'cardinality', `at most ${f.max} ${f.el} element(s) allowed`),
            );
            continue;
        }

        values.forEach((value, index) => {
            const path = repeated ? `${fieldPath}[${index}]` : fieldPath;
            if (f.kind === 'complex') {
                const sub = f.type;
                if (!sub) throw new Error(`descriptor ${type.name}.${f.el} lacks a complex type`);
                children.push(buildNode(sub, value, f.el, { ...ctx, path }));
                return;
            }
            const text = formatScalar(f, value, path, ctx);
            if (text !== undefined) children.push(leaf(f.el, text));
        });
    }

    return el(elName, children);
};

const parseScalar = <I>(f: FieldDescriptor<I>, text: string): unknown => {
    switch (f.kind) {
        case 'unsignedInt':
            return Number(text);
        case 'boolean':
            return text === 'true' || text === '1';
        default:
            return text;
    }
};

/** Inverts `buildNode`: an element tree back into an input object. */
export const parseNode = <I>(type: ComplexType<I>, node: XmlElement, ctx: ParseCtx): I => {
    const out: Record<string, unknown> = {};
    const byElement = new Map<string, FieldDescriptor<I>>();
    for (const f of type.fields) byElement.set(f.el, f);

    for (const child of node.children) {
        const f = byElement.get(child.name);
        if (!f) {
            if (ctx.onUnknownElement === 'error') {
                ctx.issues.push(
                    issue(
                        join(ctx.path, child.name),
                        'unknownElement',
                        `<${child.name}> is not part of ${type.name}`,
                    ),
                );
            }
            continue;
        }
        if (f.const !== undefined || f.key === undefined) continue;

        const repeated = f.max > 1;
        const fieldPath = join(ctx.path, f.key);

        let value: unknown;
        if (f.kind === 'complex') {
            const sub = f.type;
            if (!sub) throw new Error(`descriptor ${type.name}.${f.el} lacks a complex type`);
            const index = repeated ? ((out[f.key] as unknown[] | undefined)?.length ?? 0) : 0;
            value = parseNode(sub, child, {
                ...ctx,
                path: repeated ? `${fieldPath}[${index}]` : fieldPath,
            });
        } else {
            value = parseScalar(f, child.text ?? '');
        }

        if (repeated) {
            const list = (out[f.key] as unknown[] | undefined) ?? [];
            list.push(value);
            out[f.key] = list;
        } else {
            out[f.key] = value;
        }
    }

    return out as I;
};
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test test/core/descriptor.test.ts
```

Expected: PASS, 25 tests.

- [ ] **Step 5: Update the spec to match the two-function kernel**

In `docs/superpowers/specs/2026-08-31-audiosalad-xml-revamp-design.md`, §3.1, replace the three-bullet "Three functions consume it" list with:

```markdown
Two functions consume it:

- `buildNode(type, input, elName, ctx): XmlElement` — walks fields in order,
  formatting values *and* collecting issues in the same pass. `validateRelease`
  is this function with the tree discarded, so validation and serialization
  cannot drift apart.
- `parseNode(type, node, ctx): I` — inverts the walk.
```

Also move `onIllegalChars` in §3.2 out of `SerializeOptions` and into
`BuildOptions` in §4: escaping is decided while values are formatted, which is
build time, not serialization time.

- [ ] **Step 6: Commit**

```bash
git add src/core/descriptor.ts test/core/descriptor.test.ts docs/superpowers/specs
git commit -m "feat(core): add the field-descriptor kernel

One ordered table per complexType drives both build/validate and parse.
Element order, cardinality, and facets now live in exactly one place, so
dropped children, ordering drift, and falsy-zero omissions have no
expressible form."
```

---

## Task 6: Facets and enums

**Files:**
- Create: `src/spec/v3_4/facets.ts`, `test/spec/facets.test.ts`
- Create: `src/enums/index.ts` (re-exports), and move the existing enum files from `src/types/*.enum.ts` to `src/enums/`

**Interfaces:**
- Consumes: nothing.
- Produces: `ISRC`, `ISWC`, `UPC_EAN`, `COUNTRY_CODE` (each `{ pattern, minLength?, maxLength? }` fragments spreadable into a descriptor), and `ACTION_VALUES`, `ADVISORY_VALUES`, `FORMAT_VALUES`, `ATTR_TYPE_VALUES` (`readonly string[]`). Also `SCHEMA_ID`, `SCHEMA_NAMESPACE`, `SCHEMA_LOCATION`.

- [ ] **Step 1: Write the failing tests**

`test/spec/facets.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
    ACTION_VALUES,
    ADVISORY_VALUES,
    ATTR_TYPE_VALUES,
    COUNTRY_CODE,
    FORMAT_VALUES,
    ISRC,
    ISWC,
    SCHEMA_ID,
    SCHEMA_NAMESPACE,
    UPC_EAN,
} from '../../src/spec/v3_4/facets';

describe('schema constants', () => {
    test('identify v3.4', () => {
        expect(SCHEMA_ID).toBe('audiosalad_release_v3.4');
        expect(SCHEMA_NAMESPACE).toBe('audiosalad_release_v3.4');
    });
});

describe('ISRC', () => {
    test('accepts a real ISRC', () => {
        expect(ISRC.pattern.test('QM7G92017457')).toBe(true);
    });
    test('rejects a letter in the year positions', () => {
        expect(ISRC.pattern.test('QM7G9AA17457')).toBe(false);
    });
    test('is exactly 12 characters', () => {
        expect(ISRC.minLength).toBe(12);
        expect(ISRC.maxLength).toBe(12);
    });
});

describe('ISWC', () => {
    test('accepts a letter followed by ten digits', () => {
        expect(ISWC.pattern.test('T1234567890')).toBe(true);
    });
    test('rejects a leading digit', () => {
        expect(ISWC.pattern.test('11234567890')).toBe(false);
    });
});

describe('UPC_EAN', () => {
    test('accepts 12, 13, and 14 digits', () => {
        for (const n of [12, 13, 14]) expect('1'.repeat(n).length).toBeLessThanOrEqual(UPC_EAN.maxLength);
        expect(UPC_EAN.minLength).toBe(12);
        // v3.4 widened maxLength from 13 to 14.
        expect(UPC_EAN.maxLength).toBe(14);
    });
    test('rejects non-digits', () => {
        expect(UPC_EAN.pattern.test('12345678901A')).toBe(false);
    });
});

describe('COUNTRY_CODE', () => {
    test('accepts a two-letter code and WW', () => {
        expect(COUNTRY_CODE.pattern.test('US')).toBe(true);
        expect(COUNTRY_CODE.pattern.test('WW')).toBe(true);
    });
    test('rejects a three-letter code', () => {
        expect(COUNTRY_CODE.pattern.test('USA')).toBe(false);
    });
});

describe('enumerations', () => {
    test('action matches the XSD', () => {
        expect([...ACTION_VALUES]).toEqual(['add', 'update', 'full-update', 'meta-update', 'delete']);
    });
    test('advisory carries both cases', () => {
        expect(ADVISORY_VALUES).toContain('Explicit');
        expect(ADVISORY_VALUES).toContain('explicit');
    });
    test('format includes DJ Mix, added in v3.4', () => {
        expect(FORMAT_VALUES).toContain('DJ Mix');
        expect(FORMAT_VALUES).toContain('dj mix');
    });
    test('format has twenty members', () => {
        expect(FORMAT_VALUES).toHaveLength(20);
    });
    test('attr type matches the XSD', () => {
        expect([...ATTR_TYPE_VALUES]).toEqual([
            'integer', 'float', 'boolean', 'date', 'string', 'data',
        ]);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/spec/facets.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/spec/v3_4/facets.ts`**

Every value below is transcribed directly from `schemas/audiosalad_release_v3.4.xsd`.

```ts
export const SCHEMA_ID = 'audiosalad_release_v3.4' as const;
export const SCHEMA_NAMESPACE = 'audiosalad_release_v3.4' as const;
export const SCHEMA_LOCATION =
    'https://audiosalad-xsd.s3.amazonaws.com/audiosalad_release_v3.4.xsd' as const;

/** A spreadable fragment of a `FieldDescriptor` carrying an XSD simple type's facets. */
export interface Facet {
    readonly pattern: RegExp;
    readonly minLength: number;
    readonly maxLength: number;
}

/** isrc_type */
export const ISRC: Facet = {
    pattern: /^[A-Za-z0-9]{5}[0-9]{2}[A-Za-z0-9]{5}$/,
    minLength: 12,
    maxLength: 12,
};

/** iswc_type */
export const ISWC: Facet = {
    pattern: /^[a-zA-Z][0-9]{10}$/,
    minLength: 11,
    maxLength: 11,
};

/** upc_ean_type — maxLength widened from 13 to 14 in v3.4. */
export const UPC_EAN: Facet = {
    pattern: /^[0-9]*$/,
    minLength: 12,
    maxLength: 14,
};

/** country_code_type — a 2-character ISO code, or WW for worldwide. */
export const COUNTRY_CODE: Facet = {
    pattern: /^[A-Za-z]{2}$/,
    minLength: 2,
    maxLength: 2,
};

/** action_type */
export const ACTION_VALUES = [
    'add', 'update', 'full-update', 'meta-update', 'delete',
] as const;

/** advisory_type — the XSD enumerates both capitalizations. */
export const ADVISORY_VALUES = [
    'None', 'none', 'Clean', 'clean', 'Explicit', 'explicit',
] as const;

/** format_type — `DJ Mix`/`dj mix` are new in v3.4. */
export const FORMAT_VALUES = [
    'Digital', 'digital',
    'Single', 'single',
    'EP', 'ep',
    'Album', 'album',
    'Double Album', 'double album',
    'Box Set', 'box set',
    'Live Performance', 'live performance',
    'Classical Album', 'classical album',
    'Video', 'video',
    'DJ Mix', 'dj mix',
] as const;

/** attr_type_type */
export const ATTR_TYPE_VALUES = [
    'integer', 'float', 'boolean', 'date', 'string', 'data',
] as const;
```

- [ ] **Step 4: Move the enum modules and add the v3.4 members**

```bash
mkdir -p src/enums
git mv src/types/Action.enum.ts        src/enums/action.ts
git mv src/types/Attr.enum.ts          src/enums/attr.ts
git mv src/types/Country.enum.ts       src/enums/country.ts
git mv src/types/Genre.enum.ts         src/enums/genre.ts
git mv src/types/ParticipantRole.enum.ts src/enums/participant-role.ts
git mv src/types/PriceTier.enum.ts     src/enums/price-tier.ts
git mv src/types/ReleaseFormat.enum.ts src/enums/release-format.ts
git mv src/types/Text.enum.ts          src/enums/text.ts
```

In `src/enums/release-format.ts`, add the v3.4 member and correct the misspelled key while keeping the old one working:

```ts
export enum ReleaseFormat {
    Digital = 'digital',
    Single = 'single',
    EP = 'ep',
    Album = 'album',
    DoubleAlbum = 'double album',
    BoxSet = 'box set',
    LivePerformance = 'live performance',
    ClassicalAlbum = 'classical album',
    /** @deprecated Misspelled in 0.1.x. Use {@link ReleaseFormat.ClassicalAlbum}. */
    ClassicAlbum = 'classical album',
    Video = 'video',
    /** New in schema v3.4. */
    DJMix = 'dj mix',
}
```

In `src/enums/participant-role.ts`, add the two roles the XSD lists that the enum lacked:

```ts
    PrimaryArtist = 'Primary Artist',
    Publisher = 'Publisher',
    /** @deprecated Appears to be a typo for {@link ParticipantRole.Publisher}. */
    Publicist = 'Publicist',
```

- [ ] **Step 5: Create `src/enums/index.ts`**

```ts
export { Action } from './action';
export { AttributeType } from './attr';
export { CountryCode, CountryName } from './country';
export { Genre, SubGenre } from './genre';
export { ParticipantRole } from './participant-role';
export { iTunesPriceTier } from './price-tier';
export { ReleaseFormat } from './release-format';
export { ReleaseTextType, TrackTextType } from './text';
```

- [ ] **Step 6: Add an enum test**

`test/spec/enums.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { FORMAT_VALUES } from '../../src/spec/v3_4/facets';
import { ParticipantRole, ReleaseFormat } from '../../src/enums';

describe('ReleaseFormat', () => {
    test('every member is a legal format_type value', () => {
        for (const v of Object.values(ReleaseFormat)) {
            expect(FORMAT_VALUES as readonly string[]).toContain(v);
        }
    });
    test('exposes the v3.4 DJ Mix format', () => {
        expect(ReleaseFormat.DJMix).toBe('dj mix');
    });
    test('keeps the misspelled 0.1.x alias working', () => {
        expect(ReleaseFormat.ClassicAlbum).toBe(ReleaseFormat.ClassicalAlbum);
    });
});

describe('ParticipantRole', () => {
    test('adds the roles the XSD documents', () => {
        expect(ParticipantRole.PrimaryArtist).toBe('Primary Artist');
        expect(ParticipantRole.Publisher).toBe('Publisher');
    });
});
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
bun test test/spec/
```

Expected: PASS, 18 tests.

- [ ] **Step 8: Commit**

```bash
git add src/spec src/enums test/spec
git commit -m "feat(spec): add v3.4 facets and relocate enums

Adds the DJ Mix release format and the Primary Artist and Publisher
participant roles. Corrects the ClassicAlbum key spelling, keeping the
old key as a deprecated alias."
```

---

## Task 7: Leaf complexTypes

The six types with no complex children. Each gets an input interface in `src/model/` and a descriptor table in `src/spec/v3_4/`.

**Files:**
- Create: `src/model/index.ts`, `src/spec/v3_4/attr.ts`, `proprietary-id.ts`, `genre.ts`, `price-tier.ts`, `text.ts`, `label.ts`, `test/spec/leaf-types.test.ts`

**Interfaces:**
- Consumes: `ComplexType`, `buildNode` (Task 5); facets (Task 6).
- Produces: `ATTR`, `PROPRIETARY_ID`, `GENRE`, `PRICE_TIER`, `TEXT`, `LABEL` (each a `ComplexType<…>`), and the interfaces `AttrInput`, `ProprietaryIdInput`, `GenreInput`, `PriceTierInput`, `TextInput`, `LabelInput`.

- [ ] **Step 1: Write the failing tests**

`test/spec/leaf-types.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import { ATTR, GENRE, LABEL, PRICE_TIER, PROPRIETARY_ID, TEXT } from '../../src/spec/v3_4';

const render = <I>(type: Parameters<typeof buildNode<I>>[0], input: I, el: string) => {
    const issues: Issue[] = [];
    const xml = serialize(buildNode(type, input, el, { path: '', issues, onIllegalChars: 'error' }), {
        xmlDeclaration: false,
    });
    return { xml, issues };
};

describe('ATTR', () => {
    test('emits type, key, value in order', () => {
        const { xml, issues } = render(ATTR, { type: 'string', key: 'ss_id', value: '1234' }, 'attr');
        expect(issues).toHaveLength(0);
        expect(xml.replace(/\s+/g, '')).toBe(
            '<attr><type>string</type><key>ss_id</key><value>1234</value></attr>',
        );
    });
    test('omits an absent type', () => {
        expect(render(ATTR, { key: 'k', value: 'v' }, 'attr').xml).not.toContain('<type>');
    });
    test('rejects a type outside attr_type_type', () => {
        const { issues } = render(ATTR, { type: 'bogus', key: 'k', value: 'v' }, 'attr');
        expect(issues.map((i) => i.code)).toContain('enum');
    });
    test('requires key and value', () => {
        expect(render(ATTR, {}, 'attr').issues.map((i) => i.path)).toEqual(['key', 'value']);
    });
});

describe('PROPRIETARY_ID', () => {
    test('emits type and id', () => {
        const { xml } = render(PROPRIETARY_ID, { type: 'spotify', id: 'abc' }, 'artist_id');
        expect(xml.replace(/\s+/g, '')).toBe('<artist_id><type>spotify</type><id>abc</id></artist_id>');
    });
});

describe('GENRE', () => {
    test('emits primary alone', () => {
        expect(render(GENRE, { primary: 'Pop' }, 'genre').xml).not.toContain('<sub>');
    });
    test('emits primary and sub in order', () => {
        const { xml } = render(GENRE, { primary: 'Pop', sub: 'Adult Contemporary' }, 'genre');
        expect(xml.indexOf('<primary>')).toBeLessThan(xml.indexOf('<sub>'));
    });
});

describe('PRICE_TIER', () => {
    test('requires both type and name', () => {
        expect(render(PRICE_TIER, {}, 'price_tier').issues).toHaveLength(2);
    });
});

describe('TEXT', () => {
    test('preserves multi-line content verbatim', () => {
        const content = 'line one\nline two';
        expect(render(TEXT, { content }, 'text').xml).toContain(content);
    });
    test('requires content', () => {
        expect(render(TEXT, {}, 'text').issues[0]).toMatchObject({
            path: 'content',
            code: 'required',
        });
    });
});

describe('LABEL', () => {
    test('requires only name', () => {
        expect(render(LABEL, { name: 'Slingshot Records' }, 'label').issues).toHaveLength(0);
    });
    // 0.1.x omitted url and notes entirely, though both are in the XSD.
    test('supports url and notes', () => {
        const { xml } = render(
            LABEL,
            { name: 'N', city: 'C', state: 'S', country: 'United States', url: 'https://x.test', notes: 'hi' },
            'label',
        );
        expect(xml).toContain('<url>https://x.test</url>');
        expect(xml).toContain('<notes>hi</notes>');
    });
    test('emits fields in XSD order', () => {
        const { xml } = render(
            LABEL,
            { vendorLabelID: '1', name: 'N', city: 'C', state: 'S', country: 'US', url: 'u', notes: 'n' },
            'label',
        );
        const order = ['vendor_label_id', 'name', 'city', 'state', 'country', 'url', 'notes'];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/spec/leaf-types.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the model interfaces in `src/model/index.ts`**

```ts
import type { DateLike } from '../core/datetime';
import type { AttributeType } from '../enums/attr';
import type { CountryCode, CountryName } from '../enums/country';
import type { Genre, SubGenre } from '../enums/genre';
import type { ReleaseTextType, TrackTextType } from '../enums/text';
import type { iTunesPriceTier } from '../enums/price-tier';

/** `attr_type` — a generic key/value pair. */
export interface AttrInput {
    /** Maps to `type`. One of the `attr_type_type` values. */
    type?: AttributeType | string;
    /** Maps to `key`. Required. */
    key: string;
    /** Maps to `value`. Required; cast non-strings yourself. */
    value: string;
}

/** `proprietary_id_type` — e.g. a Spotify or Apple artist ID. */
export interface ProprietaryIdInput {
    /** Maps to `type`, e.g. `spotify`. Required. */
    type: string;
    /** Maps to `id`. Required. */
    id: string;
}

/** `genre_type` — up to two levels of granularity. */
export interface GenreInput {
    /** Maps to `primary`. Required. */
    primary: Genre | string;
    /** Maps to `sub`. */
    sub?: SubGenre | string;
}

/** `price_tier_type`. */
export interface PriceTierInput {
    /** Maps to `type`, e.g. `iTunes` or `Generic`. Required. */
    type: string;
    /** Maps to `name`. Required. */
    name: iTunesPriceTier | string;
}

/** `text_type` — descriptions, reviews, liner notes, lyrics. */
export interface TextInput {
    /** Maps to `type`. */
    type?: ReleaseTextType | TrackTextType | string;
    /** Maps to `language`. A capitalized language name, e.g. `English`. */
    language?: string;
    /** Maps to `content`. Plaintext, HTML, or TTML. Required. */
    content: string;
}

/** `label_type` — the record label behind a release. */
export interface LabelInput {
    /** Maps to `vendor_label_id`. */
    vendorLabelID?: string;
    /** Maps to `name`. Required. */
    name: string;
    /** Maps to `city`. */
    city?: string;
    /** Maps to `state`. */
    state?: string;
    /** Maps to `country`. A capitalized country name, not a code. */
    country?: CountryName | string;
    /** Maps to `url` — the company website. */
    url?: string;
    /** Maps to `notes` — label description or history, shown in AudioSalad. */
    notes?: string;
}

export type { DateLike, CountryCode };
```

- [ ] **Step 4: Create the six descriptor tables**

`src/spec/v3_4/attr.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { AttrInput } from '../../model';
import { ATTR_TYPE_VALUES } from './facets';

/** `attr_type` */
export const ATTR: ComplexType<AttrInput> = {
    name: 'attr_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 0, max: 1, values: ATTR_TYPE_VALUES },
        { el: 'key', key: 'key', kind: 'string', min: 1, max: 1 },
        { el: 'value', key: 'value', kind: 'string', min: 1, max: 1 },
    ],
};
```

`src/spec/v3_4/proprietary-id.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { ProprietaryIdInput } from '../../model';

/** `proprietary_id_type` */
export const PROPRIETARY_ID: ComplexType<ProprietaryIdInput> = {
    name: 'proprietary_id_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 1, max: 1 },
        { el: 'id', key: 'id', kind: 'string', min: 1, max: 1 },
    ],
};
```

`src/spec/v3_4/genre.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { GenreInput } from '../../model';

/** `genre_type` */
export const GENRE: ComplexType<GenreInput> = {
    name: 'genre_type',
    fields: [
        { el: 'primary', key: 'primary', kind: 'string', min: 1, max: 1 },
        { el: 'sub', key: 'sub', kind: 'string', min: 0, max: 1 },
    ],
};
```

`src/spec/v3_4/price-tier.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { PriceTierInput } from '../../model';

/** `price_tier_type` */
export const PRICE_TIER: ComplexType<PriceTierInput> = {
    name: 'price_tier_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 1, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
    ],
};
```

`src/spec/v3_4/text.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { TextInput } from '../../model';

/** `text_type` */
export const TEXT: ComplexType<TextInput> = {
    name: 'text_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 0, max: 1 },
        { el: 'language', key: 'language', kind: 'string', min: 0, max: 1 },
        { el: 'content', key: 'content', kind: 'string', min: 1, max: 1 },
    ],
};
```

`src/spec/v3_4/label.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { LabelInput } from '../../model';

/** `label_type` */
export const LABEL: ComplexType<LabelInput> = {
    name: 'label_type',
    fields: [
        { el: 'vendor_label_id', key: 'vendorLabelID', kind: 'string', min: 0, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'city', key: 'city', kind: 'string', min: 0, max: 1 },
        { el: 'state', key: 'state', kind: 'string', min: 0, max: 1 },
        { el: 'country', key: 'country', kind: 'string', min: 0, max: 1 },
        { el: 'url', key: 'url', kind: 'string', min: 0, max: 1 },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
    ],
};
```

- [ ] **Step 5: Create the spec barrel `src/spec/v3_4/index.ts`**

```ts
export * from './facets';
export { ATTR } from './attr';
export { PROPRIETARY_ID } from './proprietary-id';
export { GENRE } from './genre';
export { PRICE_TIER } from './price-tier';
export { TEXT } from './text';
export { LABEL } from './label';
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun test test/spec/leaf-types.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 7: Commit**

```bash
git add src/model src/spec test/spec
git commit -m "feat(spec): add descriptor tables for leaf complexTypes

Adds label url and notes, both present in the XSD since v3.2 but absent
from the 0.1.x Label class."
```

---

## Task 8: Composite complexTypes

The four types with complex children — and the three that carried defects 1–3. Each defect gets a named regression test here.

**Files:**
- Create: `src/spec/v3_4/participant.ts`, `asset.ts`, `permission.ts`, `territory.ts`, `test/spec/composite-types.test.ts`
- Modify: `src/model/index.ts`, `src/spec/v3_4/index.ts`

**Interfaces:**
- Consumes: `ATTR`, `PROPRIETARY_ID` (Task 7); `COUNTRY_CODE` (Task 6).
- Produces: `PARTICIPANT`, `ASSET`, `PERMISSION`, `TERRITORY`, and `ParticipantInput`, `AssetInput`, `PermissionInput`, `TerritoryInput`.

- [ ] **Step 1: Write the failing tests**

`test/spec/composite-types.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import { ASSET, PARTICIPANT, PERMISSION, TERRITORY } from '../../src/spec/v3_4';

const render = <I>(type: Parameters<typeof buildNode<I>>[0], input: I, el: string) => {
    const issues: Issue[] = [];
    const xml = serialize(buildNode(type, input, el, { path: '', issues, onIllegalChars: 'error' }), {
        xmlDeclaration: false,
    });
    return { xml, issues };
};

describe('PARTICIPANT', () => {
    // DEFECT 1 regression: 0.1.x used `artistID?.forEach(...)`, so artist_id
    // never reached the output.
    test('emits every artist_id', () => {
        const { xml, issues } = render(
            PARTICIPANT,
            {
                role: 'Main Artist',
                name: 'Billie Eilish',
                primary: true,
                artistID: [
                    { type: 'spotify', id: 'sp1' },
                    { type: 'apple', id: 'ap1' },
                ],
            },
            'participant',
        );
        expect(issues).toHaveLength(0);
        expect(xml.match(/<artist_id>/g)).toHaveLength(2);
        expect(xml).toContain('<id>sp1</id>');
        expect(xml).toContain('<id>ap1</id>');
    });

    test('emits fields in XSD order', () => {
        const { xml } = render(
            PARTICIPANT,
            { role: 'Producer', roleType: 'Executive Producer', instrument: 'Guitar', name: 'X', primary: false },
            'participant',
        );
        const order = ['role', 'role_type', 'instrument', 'name', 'primary'];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    test('requires role and name', () => {
        expect(render(PARTICIPANT, {}, 'participant').issues.map((i) => i.path)).toEqual([
            'role',
            'name',
        ]);
    });

    test('omits primary when absent, emits it when false', () => {
        expect(render(PARTICIPANT, { role: 'r', name: 'n' }, 'participant').xml).not.toContain('<primary>');
        expect(render(PARTICIPANT, { role: 'r', name: 'n', primary: false }, 'participant').xml).toContain(
            '<primary>false</primary>',
        );
    });
});

describe('ASSET', () => {
    // DEFECT 2 regression: 0.1.x used `attr?.forEach(...)`.
    test('emits every attr', () => {
        const { xml } = render(
            ASSET,
            {
                type: 'audio',
                fileName: 'a.wav',
                attr: [
                    { key: 'k1', value: 'v1' },
                    { key: 'k2', value: 'v2' },
                ],
            },
            'asset',
        );
        expect(xml.match(/<attr>/g)).toHaveLength(2);
    });

    // v3.4 made md5_checksum optional.
    test('accepts an asset with no checksum', () => {
        const { issues, xml } = render(ASSET, { type: 'image', fileName: 'c.jpg' }, 'asset');
        expect(issues).toHaveLength(0);
        expect(xml).not.toContain('<md5_checksum>');
    });

    test('requires type and file_name', () => {
        expect(render(ASSET, {}, 'asset').issues.map((i) => i.path)).toEqual([
            'type',
            'fileName',
        ]);
    });

    test('emits fields in XSD order', () => {
        const { xml } = render(
            ASSET,
            {
                type: 'audio', subtype: 'wav', name: 'n', notes: 'no', format: 'wav',
                mimeType: 'audio/wav', md5Checksum: 'abc', fileName: 'f.wav',
            },
            'asset',
        );
        const order = ['type', 'sub_type', 'name', 'notes', 'format', 'mime_type', 'md5_checksum', 'file_name'];
        const positions = order.map((e) => xml.indexOf(`<${e}>`));
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});

describe('PERMISSION', () => {
    // v3.4 made permission/type unbounded.
    test('emits multiple type elements', () => {
        const { xml, issues } = render(
            PERMISSION,
            { type: ['stream', 'download'], enabled: true },
            'permission',
        );
        expect(issues).toHaveLength(0);
        expect(xml.match(/<type>/g)).toHaveLength(2);
    });

    test('requires at least one type and an explicit enabled', () => {
        const { issues } = render(PERMISSION, { type: [] }, 'permission');
        expect(issues.map((i) => i.code)).toEqual(['required', 'required']);
    });

    // v3.4 added attr, between end_date and country_code.
    test('emits attr before country_code', () => {
        const { xml } = render(
            PERMISSION,
            {
                type: ['preorder'],
                enabled: true,
                startDate: '2021-01-01T00:00:00Z',
                endDate: '2021-12-31T00:00:00Z',
                attr: [{ key: 'k', value: 'v' }],
                countryCode: ['US'],
            },
            'permission',
        );
        expect(xml.indexOf('<attr>')).toBeLessThan(xml.indexOf('<country_code>'));
        expect(xml.indexOf('<end_date>')).toBeLessThan(xml.indexOf('<attr>'));
    });

    test('rejects a three-letter country code', () => {
        const { issues } = render(
            PERMISSION,
            { type: ['stream'], enabled: true, countryCode: ['USA'] },
            'permission',
        );
        expect(issues[0]).toMatchObject({ path: 'countryCode[0]', code: 'pattern' });
    });
});

describe('TERRITORY', () => {
    // DEFECT 3 regression: 0.1.x used `permissions?.forEach(...)`.
    test('emits every permission', () => {
        const { xml } = render(
            TERRITORY,
            {
                countryCode: ['WW'],
                permissions: [
                    { type: ['stream'], enabled: true },
                    { type: ['download'], enabled: false },
                ],
            },
            'territory',
        );
        expect(xml.match(/<permission>/g)).toHaveLength(2);
    });

    test('requires at least one country_code', () => {
        expect(render(TERRITORY, {}, 'territory').issues[0]).toMatchObject({
            path: 'countryCode',
            code: 'required',
        });
    });

    test('emits multiple country codes then release_date', () => {
        const { xml } = render(
            TERRITORY,
            { countryCode: ['US', 'CA'], releaseDate: '2020-05-02T00:00:00Z' },
            'territory',
        );
        expect(xml.match(/<country_code>/g)).toHaveLength(2);
        expect(xml.indexOf('<country_code>')).toBeLessThan(xml.indexOf('<release_date>'));
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/spec/composite-types.test.ts
```

Expected: FAIL — `ASSET`, `PARTICIPANT`, `PERMISSION`, `TERRITORY` are not exported.

- [ ] **Step 3: Add the model interfaces to `src/model/index.ts`**

```ts
/** `participant_type` — anyone involved in a recording or release. */
export interface ParticipantInput {
    /** Maps to `role`, e.g. `Main Artist`. Required. */
    role: ParticipantRole | string;
    /** Maps to `role_type` — an optional vendor sub-role, e.g. `Executive Producer`. */
    roleType?: string;
    /** Maps to `instrument`. Generally used with the Performer role. */
    instrument?: string;
    /** Maps to `name`. Required. */
    name: string;
    /** Maps to `primary`. Omitted entirely when undefined; `false` is emitted. */
    primary?: boolean;
    /** Maps to `artist_id` — third-party IDs for this participant. */
    artistID?: ProprietaryIdInput[];
}

/** `asset_type` — an audio recording, artwork image, or arbitrary file. */
export interface AssetInput {
    /** Maps to `type`, e.g. `audio`, `image`, `asset`. Required. */
    type: 'audio' | 'image' | 'asset' | (string & {});
    /** Maps to `sub_type` — the AudioSalad media type, e.g. `wav`, `Front`. */
    subtype?: string;
    /** Maps to `name`. */
    name?: string;
    /** Maps to `notes`. */
    notes?: string;
    /** Maps to `format`, generally the file extension. */
    format?: string;
    /** Maps to `mime_type`, e.g. `audio/flac`. */
    mimeType?: string;
    /** Maps to `md5_checksum`. Optional as of schema v3.4. */
    md5Checksum?: string;
    /** Maps to `file_name` — filename with extension, no folder structure. Required. */
    fileName: string;
    /** Maps to `attr`. */
    attr?: AttrInput[];
}

/** `permission_type` — a date- and region-bounded distribution permission. */
export interface PermissionInput {
    /**
     * Maps to `type`. **A list as of schema v3.4** — 0.1.x took a single
     * string. Release level: `preorder`. Track level: `stream`, `download`,
     * `subscription`, `track_sale`. At least one required.
     */
    type: string[];
    /** Maps to `enabled`. Required — there is no default. */
    enabled: boolean;
    /** Maps to `start_date`. A `Date` is formatted in UTC. */
    startDate?: DateLike;
    /** Maps to `end_date`. A `Date` is formatted in UTC. */
    endDate?: DateLike;
    /** Maps to `attr`. New in schema v3.4. */
    attr?: AttrInput[];
    /** Maps to `country_code` — 2-character ISO codes, or `WW`. */
    countryCode?: Array<CountryCode | string>;
}

/** `territory_type` — a release's or track's presence in a place. */
export interface TerritoryInput {
    /** Maps to `country_code`. At least one required. */
    countryCode: Array<CountryCode | string>;
    /** Maps to `release_date`. A `Date` is formatted in UTC. */
    releaseDate?: DateLike;
    /**
     * Maps to `permission`. Territory-level overrides.
     *
     * *Currently unsupported by AudioSalad, per the XSD comment.*
     */
    permissions?: PermissionInput[];
}
```

Add `import type { ParticipantRole } from '../enums/participant-role';` to the file's import block.

- [ ] **Step 4: Create the four descriptor tables**

`src/spec/v3_4/participant.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { ParticipantInput } from '../../model';
import { PROPRIETARY_ID } from './proprietary-id';

/** `participant_type` */
export const PARTICIPANT: ComplexType<ParticipantInput> = {
    name: 'participant_type',
    fields: [
        { el: 'role', key: 'role', kind: 'string', min: 1, max: 1 },
        { el: 'role_type', key: 'roleType', kind: 'string', min: 0, max: 1 },
        { el: 'instrument', key: 'instrument', kind: 'string', min: 0, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'primary', key: 'primary', kind: 'boolean', min: 0, max: 1 },
        {
            el: 'artist_id',
            key: 'artistID',
            kind: 'complex',
            type: PROPRIETARY_ID,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
    ],
};
```

`src/spec/v3_4/asset.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { AssetInput } from '../../model';
import { ATTR } from './attr';

/** `asset_type` */
export const ASSET: ComplexType<AssetInput> = {
    name: 'asset_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 1, max: 1 },
        { el: 'sub_type', key: 'subtype', kind: 'string', min: 0, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 0, max: 1 },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
        { el: 'format', key: 'format', kind: 'string', min: 0, max: 1 },
        { el: 'mime_type', key: 'mimeType', kind: 'string', min: 0, max: 1 },
        // minOccurs relaxed from 1 to 0 in schema v3.4.
        { el: 'md5_checksum', key: 'md5Checksum', kind: 'string', min: 0, max: 1 },
        { el: 'file_name', key: 'fileName', kind: 'string', min: 1, max: 1 },
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: Number.POSITIVE_INFINITY },
    ],
};
```

`src/spec/v3_4/permission.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { PermissionInput } from '../../model';
import { ATTR } from './attr';
import { COUNTRY_CODE } from './facets';

/** `permission_type` */
export const PERMISSION: ComplexType<PermissionInput> = {
    name: 'permission_type',
    fields: [
        // maxOccurs widened from 1 to unbounded in schema v3.4.
        { el: 'type', key: 'type', kind: 'string', min: 1, max: Number.POSITIVE_INFINITY },
        { el: 'enabled', key: 'enabled', kind: 'boolean', min: 1, max: 1 },
        { el: 'start_date', key: 'startDate', kind: 'dateTime', min: 0, max: 1 },
        { el: 'end_date', key: 'endDate', kind: 'dateTime', min: 0, max: 1 },
        // New in schema v3.4.
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: Number.POSITIVE_INFINITY },
        {
            el: 'country_code',
            key: 'countryCode',
            kind: 'string',
            min: 0,
            max: Number.POSITIVE_INFINITY,
            ...COUNTRY_CODE,
        },
    ],
};
```

`src/spec/v3_4/territory.ts`:

```ts
import type { ComplexType } from '../../core/descriptor';
import type { TerritoryInput } from '../../model';
import { COUNTRY_CODE } from './facets';
import { PERMISSION } from './permission';

/** `territory_type` */
export const TERRITORY: ComplexType<TerritoryInput> = {
    name: 'territory_type',
    fields: [
        {
            el: 'country_code',
            key: 'countryCode',
            kind: 'string',
            min: 1,
            max: Number.POSITIVE_INFINITY,
            ...COUNTRY_CODE,
        },
        { el: 'release_date', key: 'releaseDate', kind: 'dateTime', min: 0, max: 1 },
        {
            el: 'permission',
            key: 'permissions',
            kind: 'complex',
            type: PERMISSION,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
    ],
};
```

- [ ] **Step 5: Extend `src/spec/v3_4/index.ts`**

```ts
export { PARTICIPANT } from './participant';
export { ASSET } from './asset';
export { PERMISSION } from './permission';
export { TERRITORY } from './territory';
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
bun test test/spec/composite-types.test.ts
```

Expected: PASS, 14 tests — including the three defect regressions.

- [ ] **Step 7: Commit**

```bash
git add src/model src/spec test/spec
git commit -m "feat(spec): add composite descriptor tables

Fixes three silently dropped element groups: participant artist_id,
asset attr, and territory permission. Adopts the v3.4 changes to
permission (unbounded type, new attr) and asset (optional checksum)."
```

---

## Task 9: Track and Release tables

**Files:**
- Create: `src/spec/v3_4/track.ts`, `src/spec/v3_4/release.ts`, `test/spec/release.test.ts`
- Modify: `src/model/index.ts`, `src/spec/v3_4/index.ts`

**Interfaces:**
- Consumes: every table from Tasks 7–8.
- Produces: `TRACK`, `RELEASE` (`ComplexType<…>`), `ROOT_ATTRS` (the namespace attribute pairs for `<release>`), and `TrackInput`, `ReleaseInput`.

- [ ] **Step 1: Write the failing tests**

`test/spec/release.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { buildNode } from '../../src/core/descriptor';
import type { Issue } from '../../src/core/issues';
import { serialize } from '../../src/core/serialize';
import { RELEASE, TRACK } from '../../src/spec/v3_4';
import type { ReleaseInput } from '../../src/model';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'T',
    displayArtist: 'A',
    tracks: [{ trackNumber: 1, title: 'One', displayArtist: 'A' }],
};

const render = <I>(type: Parameters<typeof buildNode<I>>[0], input: I, el: string) => {
    const issues: Issue[] = [];
    const xml = serialize(buildNode(type, input, el, { path: '', issues, onIllegalChars: 'error' }), {
        xmlDeclaration: false,
    });
    return { xml, issues };
};

describe('TRACK', () => {
    test('requires track_number, title, and display_artist', () => {
        expect(render(TRACK, {}, 'track').issues.map((i) => i.path)).toEqual([
            'trackNumber', 'title', 'displayArtist',
        ]);
    });

    // DEFECT 4 regression: `previewStart: 0` was dropped by a falsy guard.
    test('emits preview_start when it is zero', () => {
        const { xml } = render(
            TRACK,
            { trackNumber: 1, title: 'T', displayArtist: 'A', previewStart: 0, previewDuration: 30 },
            'track',
        );
        expect(xml).toContain('<preview_start>0</preview_start>');
    });

    test('validates ISRC and ISWC', () => {
        const bad = render(
            TRACK,
            { trackNumber: 1, title: 'T', displayArtist: 'A', isrc: 'NOPE', iswc: '123' },
            'track',
        );
        expect(bad.issues.map((i) => i.path)).toContain('isrc');
        expect(bad.issues.map((i) => i.path)).toContain('iswc');

        const good = render(
            TRACK,
            { trackNumber: 1, title: 'T', displayArtist: 'A', isrc: 'QM7G92017457', iswc: 'T1234567890' },
            'track',
        );
        expect(good.issues).toHaveLength(0);
    });

    test('emits all 29 elements in XSD sequence order', () => {
        const { xml } = render(
            TRACK,
            {
                vendorTrackID: 'v', isrc: 'QM7G92017457', iswc: 'T1234567890', discNumber: 1,
                trackNumber: 1, title: 'T', titleVersion: 'tv', work: 'w', trackLength: 181,
                advisory: 'explicit', audioLanguage: 'English', bpm: 120, previewStart: 30,
                previewDuration: 30, displayArtist: 'A',
                participants: [{ role: 'Main Artist', name: 'A' }],
                genres: [{ primary: 'Pop' }], tags: ['t'], notes: 'n',
                texts: [{ content: 'c' }], cInfo: 'ci', cYear: 2020, pInfo: 'pi', pYear: 2020,
                rightsHolders: 'rh', priceTiers: [{ type: 'iTunes', name: 'Mid' }],
                permissions: [{ type: ['stream'], enabled: true }],
                territories: [{ countryCode: ['WW'] }],
                assets: [{ type: 'audio', fileName: 'a.wav' }],
                attr: [{ key: 'k', value: 'v' }],
            },
            'track',
        );
        const order = [
            'vendor_track_id', 'isrc', 'iswc', 'disc_number', 'track_number', 'title',
            'title_version', 'work', 'track_length', 'advisory', 'audio_language', 'bpm',
            'preview_start', 'preview_duration', 'display_artist', 'participant', 'genre',
            'tag', 'notes', 'text', 'c_info', 'c_year', 'p_info', 'p_year', 'rights_holders',
            'price_tier', 'permission', 'territory', 'asset', 'attr',
        ];
        const positions = order.map((e) => {
            const at = xml.indexOf(`<${e}>`);
            expect(at).toBeGreaterThan(-1);
            return at;
        });
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});

describe('RELEASE', () => {
    test('accepts a minimal release', () => {
        expect(render(RELEASE, minimal, 'release').issues).toHaveLength(0);
    });

    test('emits the v3.4 schema_id without reading input', () => {
        expect(render(RELEASE, minimal, 'release').xml).toContain(
            '<schema_id>audiosalad_release_v3.4</schema_id>',
        );
    });

    test('schema_id is the first child', () => {
        const { xml } = render(RELEASE, minimal, 'release');
        expect(xml.indexOf('<schema_id>')).toBeLessThan(xml.indexOf('<action>'));
    });

    test('requires at least one track', () => {
        const { issues } = render(RELEASE, { ...minimal, tracks: [] }, 'release');
        expect(issues[0]).toMatchObject({ path: 'tracks', code: 'required' });
    });

    test('requires action, title, and display_artist', () => {
        const { issues } = render(RELEASE, { tracks: minimal.tracks }, 'release');
        expect(issues.map((i) => i.path)).toEqual(['action', 'title', 'displayArtist']);
    });

    test('validates action against action_type', () => {
        expect(
            render(RELEASE, { ...minimal, action: 'destroy' }, 'release').issues.map((i) => i.code),
        ).toContain('enum');
    });

    test('validates upc_ean length and digits', () => {
        expect(render(RELEASE, { ...minimal, upc: '123' }, 'release').issues.map((i) => i.code)).toContain(
            'minLength',
        );
        // v3.4 widened the maximum to 14.
        expect(render(RELEASE, { ...minimal, upc: '12345678901234' }, 'release').issues).toHaveLength(0);
    });

    test('emits an original_release_date that is only a year', () => {
        expect(
            render(RELEASE, { ...minimal, originalReleaseDate: '2019' }, 'release').xml,
        ).toContain('<original_release_date>2019</original_release_date>');
    });

    test('emits compilation when it is false', () => {
        expect(render(RELEASE, { ...minimal, compilation: false }, 'release').xml).toContain(
            '<compilation>false</compilation>',
        );
    });

    test('has no dsp_delivery field — removed in v3.4', () => {
        expect(RELEASE.fields.some((f) => f.el === 'dsp_delivery')).toBe(false);
    });

    test('emits all 40 elements in XSD sequence order', () => {
        const { xml } = render(
            RELEASE,
            {
                ...minimal,
                distributorName: 'd', exportID: 'e', exportTime: '2020-05-02T00:00:00Z',
                upc: '123456789012', vendorReleaseID: 'vr', globalReleaseID: 'gr', catalogID: 'c',
                series: 's', titleVersion: 'tv', advisory: 'explicit', metadataLanguage: 'English',
                audioLanguage: 'English', participants: [{ role: 'Main Artist', name: 'A' }],
                compilation: false, originalReleaseDate: '2020-05-02', releaseDate: '2020-05-02',
                releaseFormat: 'single', recordingLocation: 'US', url: 'https://x.test',
                genres: [{ primary: 'Pop' }], tags: ['t'], notes: 'n', texts: [{ content: 'c' }],
                cInfo: 'ci', cYear: 2020, pInfo: 'pi', pYear: 2020, rightsHolders: 'rh',
                label: { name: 'L' }, priceTiers: [{ type: 'iTunes', name: 'Mid' }],
                permissions: [{ type: ['preorder'], enabled: true }],
                globalReleaseDate: '2020-05-02T21:00:00Z',
                territories: [{ countryCode: ['WW'] }],
                assets: [{ type: 'image', fileName: 'c.jpg' }],
                attr: [{ key: 'k', value: 'v' }],
            },
            'release',
        );
        const order = [
            'schema_id', 'distributor_name', 'export_id', 'export_time', 'action', 'upc_ean',
            'vendor_release_id', 'global_release_id', 'catalog_id', 'series', 'title',
            'title_version', 'advisory', 'metadata_language', 'audio_language', 'display_artist',
            'participant', 'compilation', 'original_release_date', 'release_date',
            'release_format', 'recording_location', 'url', 'genre', 'tag', 'notes', 'text',
            'c_info', 'c_year', 'p_info', 'p_year', 'rights_holders', 'label', 'price_tier',
            'permission', 'global_release_date', 'territory', 'asset', 'track', 'attr',
        ];
        const positions = order.map((e) => {
            const at = xml.indexOf(`<${e}>`);
            expect(at).toBeGreaterThan(-1);
            return at;
        });
        expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/spec/release.test.ts
```

Expected: FAIL — `TRACK` and `RELEASE` are not exported.

- [ ] **Step 3: Add `TrackInput` and `ReleaseInput` to `src/model/index.ts`**

```ts
/** `track_type` — a single audio track within a release. */
export interface TrackInput {
    /** Maps to `vendor_track_id`. */
    vendorTrackID?: string;
    /** Maps to `isrc` — 12 characters, `[A-Za-z0-9]{5}[0-9]{2}[A-Za-z0-9]{5}`. */
    isrc?: string;
    /** Maps to `iswc` — 11 characters, a letter then ten digits. */
    iswc?: string;
    /** Maps to `disc_number`. */
    discNumber?: number;
    /** Maps to `track_number`. Required. */
    trackNumber: number;
    /** Maps to `title`. Required. */
    title: string;
    /** Maps to `title_version`, e.g. `Radio Edit`. */
    titleVersion?: string;
    /** Maps to `work` — classical content only. */
    work?: string;
    /** Maps to `track_length`, in seconds. */
    trackLength?: number;
    /** Maps to `advisory`. */
    advisory?: 'none' | 'clean' | 'explicit' | 'None' | 'Clean' | 'Explicit';
    /** Maps to `audio_language`. Overrides the release-level value. */
    audioLanguage?: string;
    /** Maps to `bpm`. */
    bpm?: number;
    /** Maps to `preview_start`, in seconds. `0` is a valid, emitted value. */
    previewStart?: number;
    /** Maps to `preview_duration`, in seconds. */
    previewDuration?: number;
    /** Maps to `display_artist`. Required. */
    displayArtist: string;
    /** Maps to `participant`. */
    participants?: ParticipantInput[];
    /** Maps to `genre`. */
    genres?: GenreInput[];
    /** Maps to `tag`. */
    tags?: string[];
    /** Maps to `notes` — shown only inside AudioSalad. */
    notes?: string;
    /** Maps to `text` — generally lyrics. */
    texts?: TextInput[];
    /** Maps to `c_info`. */
    cInfo?: string;
    /** Maps to `c_year`. */
    cYear?: number;
    /** Maps to `p_info`. */
    pInfo?: string;
    /** Maps to `p_year`. */
    pYear?: number;
    /** Maps to `rights_holders`. */
    rightsHolders?: string;
    /** Maps to `price_tier`. *Currently unsupported by AudioSalad.* */
    priceTiers?: PriceTierInput[];
    /** Maps to `permission`. */
    permissions?: PermissionInput[];
    /** Maps to `territory`. */
    territories?: TerritoryInput[];
    /** Maps to `asset` — crucially including the recording itself. */
    assets?: AssetInput[];
    /** Maps to `attr`. */
    attr?: AttrInput[];
}

/** The `release` root element. */
export interface ReleaseInput {
    /** Maps to `distributor_name`, usually the vendor name. */
    distributorName?: string;
    /** Maps to `export_id`. Informational only. */
    exportID?: string;
    /** Maps to `export_time`. A `Date` is formatted in UTC. */
    exportTime?: DateLike;
    /** Maps to `action`. Required. */
    action: Action | string;
    /** Maps to `upc_ean`. A string, to preserve leading zeros. 12–14 digits. */
    upc?: string;
    /** Maps to `vendor_release_id`. Informational only. */
    vendorReleaseID?: string;
    /** Maps to `global_release_id` — the AudioSalad identifier. */
    globalReleaseID?: string;
    /** Maps to `catalog_id`. */
    catalogID?: string;
    /** Maps to `series`. */
    series?: string;
    /** Maps to `title`, minus any title version. Required. */
    title: string;
    /** Maps to `title_version`, e.g. `Remixes`. */
    titleVersion?: string;
    /** Maps to `advisory`. */
    advisory?: 'none' | 'clean' | 'explicit' | 'None' | 'Clean' | 'Explicit';
    /** Maps to `metadata_language`. A capitalized language name. */
    metadataLanguage?: string;
    /** Maps to `audio_language`. A capitalized language name. */
    audioLanguage?: string;
    /** Maps to `display_artist`. Required. */
    displayArtist: string;
    /** Maps to `participant`. */
    participants?: ParticipantInput[];
    /** Maps to `compilation`. `false` is emitted; omit the key for absence. */
    compilation?: boolean;
    /** Maps to `original_release_date`. Accepts `YYYY`, `YYYY-MM`, or `YYYY-MM-DD`. */
    originalReleaseDate?: DateLike;
    /** Maps to `release_date`. A `Date` is formatted in UTC. */
    releaseDate?: DateLike;
    /** Maps to `release_format`. */
    releaseFormat?: ReleaseFormat | string;
    /** Maps to `recording_location` — a 2-character ISO country code. */
    recordingLocation?: CountryCode | string;
    /** Maps to `url`. */
    url?: string;
    /** Maps to `genre`. */
    genres?: GenreInput[];
    /** Maps to `tag`. */
    tags?: string[];
    /** Maps to `notes` — shown only inside AudioSalad. */
    notes?: string;
    /** Maps to `text` — descriptions, reviews, liner notes. */
    texts?: TextInput[];
    /** Maps to `c_info`. */
    cInfo?: string;
    /** Maps to `c_year`. */
    cYear?: number;
    /** Maps to `p_info`. */
    pInfo?: string;
    /** Maps to `p_year`. */
    pYear?: number;
    /** Maps to `rights_holders`. */
    rightsHolders?: string;
    /** Maps to `label`. */
    label?: LabelInput;
    /** Maps to `price_tier`. */
    priceTiers?: PriceTierInput[];
    /** Maps to `permission`. */
    permissions?: PermissionInput[];
    /** Maps to `global_release_date` — a timed global release, in UTC. */
    globalReleaseDate?: DateLike;
    /** Maps to `territory`. */
    territories?: TerritoryInput[];
    /** Maps to `asset` — images, music videos, documentation. */
    assets?: AssetInput[];
    /** Maps to `track`. At least one required. */
    tracks: TrackInput[];
    /** Maps to `attr`. */
    attr?: AttrInput[];
}
```

Add `import type { Action } from '../enums/action';` and `import type { ReleaseFormat } from '../enums/release-format';` to the import block.

> **`dspDeliveries` is deliberately absent.** `dsp_delivery` was removed from the schema in v3.4.

- [ ] **Step 4: Create `src/spec/v3_4/track.ts`**

```ts
import type { ComplexType } from '../../core/descriptor';
import type { TrackInput } from '../../model';
import { ASSET } from './asset';
import { ATTR } from './attr';
import { ADVISORY_VALUES, ISRC, ISWC } from './facets';
import { GENRE } from './genre';
import { PARTICIPANT } from './participant';
import { PERMISSION } from './permission';
import { PRICE_TIER } from './price-tier';
import { TERRITORY } from './territory';
import { TEXT } from './text';

const UNBOUNDED = Number.POSITIVE_INFINITY;

/** `track_type` */
export const TRACK: ComplexType<TrackInput> = {
    name: 'track_type',
    fields: [
        { el: 'vendor_track_id', key: 'vendorTrackID', kind: 'string', min: 0, max: 1 },
        { el: 'isrc', key: 'isrc', kind: 'string', min: 0, max: 1, ...ISRC },
        { el: 'iswc', key: 'iswc', kind: 'string', min: 0, max: 1, ...ISWC },
        { el: 'disc_number', key: 'discNumber', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'track_number', key: 'trackNumber', kind: 'unsignedInt', min: 1, max: 1 },
        { el: 'title', key: 'title', kind: 'string', min: 1, max: 1 },
        { el: 'title_version', key: 'titleVersion', kind: 'string', min: 0, max: 1 },
        { el: 'work', key: 'work', kind: 'string', min: 0, max: 1 },
        { el: 'track_length', key: 'trackLength', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'advisory', key: 'advisory', kind: 'string', min: 0, max: 1, values: ADVISORY_VALUES },
        { el: 'audio_language', key: 'audioLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'bpm', key: 'bpm', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'preview_start', key: 'previewStart', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'preview_duration', key: 'previewDuration', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'display_artist', key: 'displayArtist', kind: 'string', min: 1, max: 1 },
        { el: 'participant', key: 'participants', kind: 'complex', type: PARTICIPANT, min: 0, max: UNBOUNDED },
        { el: 'genre', key: 'genres', kind: 'complex', type: GENRE, min: 0, max: UNBOUNDED },
        { el: 'tag', key: 'tags', kind: 'string', min: 0, max: UNBOUNDED },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
        { el: 'text', key: 'texts', kind: 'complex', type: TEXT, min: 0, max: UNBOUNDED },
        { el: 'c_info', key: 'cInfo', kind: 'string', min: 0, max: 1 },
        { el: 'c_year', key: 'cYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'p_info', key: 'pInfo', kind: 'string', min: 0, max: 1 },
        { el: 'p_year', key: 'pYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'rights_holders', key: 'rightsHolders', kind: 'string', min: 0, max: 1 },
        { el: 'price_tier', key: 'priceTiers', kind: 'complex', type: PRICE_TIER, min: 0, max: UNBOUNDED },
        { el: 'permission', key: 'permissions', kind: 'complex', type: PERMISSION, min: 0, max: UNBOUNDED },
        { el: 'territory', key: 'territories', kind: 'complex', type: TERRITORY, min: 0, max: UNBOUNDED },
        { el: 'asset', key: 'assets', kind: 'complex', type: ASSET, min: 0, max: UNBOUNDED },
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: UNBOUNDED },
    ],
};
```

- [ ] **Step 5: Create `src/spec/v3_4/release.ts`**

```ts
import type { ComplexType } from '../../core/descriptor';
import type { ReleaseInput } from '../../model';
import { ASSET } from './asset';
import { ATTR } from './attr';
import {
    ACTION_VALUES, ADVISORY_VALUES, COUNTRY_CODE, FORMAT_VALUES,
    SCHEMA_ID, SCHEMA_LOCATION, SCHEMA_NAMESPACE, UPC_EAN,
} from './facets';
import { GENRE } from './genre';
import { LABEL } from './label';
import { PARTICIPANT } from './participant';
import { PERMISSION } from './permission';
import { PRICE_TIER } from './price-tier';
import { TERRITORY } from './territory';
import { TEXT } from './text';
import { TRACK } from './track';

const UNBOUNDED = Number.POSITIVE_INFINITY;

/** Namespace attributes for the `<release>` root element. */
export const ROOT_ATTRS: ReadonlyArray<readonly [string, string]> = [
    ['xmlns', SCHEMA_NAMESPACE],
    ['xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance'],
    ['xsi:schemaLocation', `${SCHEMA_NAMESPACE} ${SCHEMA_LOCATION}`],
];

/** The `release` root element. */
export const RELEASE: ComplexType<ReleaseInput> = {
    name: 'release',
    fields: [
        { el: 'schema_id', kind: 'string', min: 1, max: 1, const: SCHEMA_ID },
        { el: 'distributor_name', key: 'distributorName', kind: 'string', min: 0, max: 1 },
        { el: 'export_id', key: 'exportID', kind: 'string', min: 0, max: 1 },
        { el: 'export_time', key: 'exportTime', kind: 'dateTime', min: 0, max: 1 },
        { el: 'action', key: 'action', kind: 'string', min: 1, max: 1, values: ACTION_VALUES },
        { el: 'upc_ean', key: 'upc', kind: 'string', min: 0, max: 1, ...UPC_EAN },
        { el: 'vendor_release_id', key: 'vendorReleaseID', kind: 'string', min: 0, max: 1 },
        { el: 'global_release_id', key: 'globalReleaseID', kind: 'string', min: 0, max: 1 },
        { el: 'catalog_id', key: 'catalogID', kind: 'string', min: 0, max: 1 },
        { el: 'series', key: 'series', kind: 'string', min: 0, max: 1 },
        { el: 'title', key: 'title', kind: 'string', min: 1, max: 1 },
        { el: 'title_version', key: 'titleVersion', kind: 'string', min: 0, max: 1 },
        { el: 'advisory', key: 'advisory', kind: 'string', min: 0, max: 1, values: ADVISORY_VALUES },
        { el: 'metadata_language', key: 'metadataLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'audio_language', key: 'audioLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'display_artist', key: 'displayArtist', kind: 'string', min: 1, max: 1 },
        { el: 'participant', key: 'participants', kind: 'complex', type: PARTICIPANT, min: 0, max: UNBOUNDED },
        { el: 'compilation', key: 'compilation', kind: 'boolean', min: 0, max: 1 },
        { el: 'original_release_date', key: 'originalReleaseDate', kind: 'partialDate', min: 0, max: 1 },
        { el: 'release_date', key: 'releaseDate', kind: 'date', min: 0, max: 1 },
        { el: 'release_format', key: 'releaseFormat', kind: 'string', min: 0, max: 1, values: FORMAT_VALUES },
        { el: 'recording_location', key: 'recordingLocation', kind: 'string', min: 0, max: 1, ...COUNTRY_CODE },
        { el: 'url', key: 'url', kind: 'string', min: 0, max: 1 },
        { el: 'genre', key: 'genres', kind: 'complex', type: GENRE, min: 0, max: UNBOUNDED },
        { el: 'tag', key: 'tags', kind: 'string', min: 0, max: UNBOUNDED },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
        { el: 'text', key: 'texts', kind: 'complex', type: TEXT, min: 0, max: UNBOUNDED },
        { el: 'c_info', key: 'cInfo', kind: 'string', min: 0, max: 1 },
        { el: 'c_year', key: 'cYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'p_info', key: 'pInfo', kind: 'string', min: 0, max: 1 },
        { el: 'p_year', key: 'pYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'rights_holders', key: 'rightsHolders', kind: 'string', min: 0, max: 1 },
        { el: 'label', key: 'label', kind: 'complex', type: LABEL, min: 0, max: 1 },
        { el: 'price_tier', key: 'priceTiers', kind: 'complex', type: PRICE_TIER, min: 0, max: UNBOUNDED },
        { el: 'permission', key: 'permissions', kind: 'complex', type: PERMISSION, min: 0, max: UNBOUNDED },
        { el: 'global_release_date', key: 'globalReleaseDate', kind: 'dateTime', min: 0, max: 1 },
        { el: 'territory', key: 'territories', kind: 'complex', type: TERRITORY, min: 0, max: UNBOUNDED },
        { el: 'asset', key: 'assets', kind: 'complex', type: ASSET, min: 0, max: UNBOUNDED },
        { el: 'track', key: 'tracks', kind: 'complex', type: TRACK, min: 1, max: UNBOUNDED },
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: UNBOUNDED },
    ],
};
```

- [ ] **Step 6: Extend `src/spec/v3_4/index.ts`**

```ts
export { TRACK } from './track';
export { RELEASE, ROOT_ATTRS } from './release';
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
bun test test/spec/
```

Expected: PASS — the ordering tests confirm all 30 track fields and all 40 release fields sit in XSD sequence order.

- [ ] **Step 8: Commit**

```bash
git add src/model src/spec test/spec
git commit -m "feat(spec): add track and release descriptor tables

Targets schema v3.4: new namespace and schema_id, widened upc_ean, and
no dsp_delivery, which the schema removed."
```

---

## Task 10: Public API

**Files:**
- Create: `src/api.ts`, `test/api.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `RELEASE`, `ROOT_ATTRS` (Task 9); `buildNode`, `parseNode` (Task 5); `serialize`, `parseXml` (Tasks 2, 4).
- Produces: `buildRelease`, `validateRelease`, `parseRelease`, `BuildOptions`, `ParseOptions`.

- [ ] **Step 1: Write the failing tests**

`test/api.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
    AudioSaladValidationError,
    buildRelease,
    parseRelease,
    validateRelease,
} from '../src/api';
import type { ReleaseInput } from '../src/model';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'Everything I Wanted',
    displayArtist: 'Billie Eilish',
    tracks: [{ trackNumber: 1, title: 'Everything I Wanted', displayArtist: 'Billie Eilish' }],
};

describe('buildRelease', () => {
    test('emits an XML declaration and the v3.4 namespace', () => {
        const xml = buildRelease(minimal);
        expect(xml).toStartWith('<?xml version="1.0" encoding="UTF-8"?>\n');
        expect(xml).toContain('<release xmlns="audiosalad_release_v3.4"');
        expect(xml).toContain('xsi:schemaLocation="audiosalad_release_v3.4 https://');
    });

    test('omits the declaration on request', () => {
        expect(buildRelease(minimal, { xmlDeclaration: false })).toStartWith('<release');
    });

    test('throws AudioSaladValidationError carrying every issue', () => {
        let caught: unknown;
        try {
            buildRelease({ tracks: [] } as never);
        } catch (e) {
            caught = e;
        }
        expect(caught).toBeInstanceOf(AudioSaladValidationError);
        const issues = (caught as AudioSaladValidationError).issues;
        expect(issues.map((i) => i.path)).toEqual(['action', 'title', 'displayArtist', 'tracks']);
    });

    test('the error message names the first few problems', () => {
        expect(() => buildRelease({ tracks: [] } as never)).toThrow(/action: .*required/);
    });

    test('skips validation when asked', () => {
        expect(() => buildRelease({ ...minimal, upc: 'nope' }, { validate: false })).not.toThrow();
    });
});

describe('validateRelease', () => {
    test('returns an empty array for a valid release', () => {
        expect(validateRelease(minimal)).toEqual([]);
    });

    test('never throws', () => {
        expect(() => validateRelease({} as never)).not.toThrow();
        expect(validateRelease({} as never).length).toBeGreaterThan(0);
    });

    test('paths point into the input, not the XML', () => {
        const issues = validateRelease({
            ...minimal,
            tracks: [{ trackNumber: 1, title: 't', displayArtist: 'a', isrc: 'BAD' }],
        });
        expect(issues[0]?.path).toBe('tracks[0].isrc');
    });
});

describe('parseRelease', () => {
    test('round-trips through build', () => {
        expect(buildRelease(parseRelease(buildRelease(minimal)))).toBe(buildRelease(minimal));
    });

    test('recovers nested structure', () => {
        const input: ReleaseInput = {
            ...minimal,
            label: { name: 'Slingshot Records', url: 'https://x.test' },
            tracks: [
                {
                    trackNumber: 1, title: 'T', displayArtist: 'A', previewStart: 0,
                    participants: [{ role: 'Main Artist', name: 'A', primary: true, artistID: [{ type: 'spotify', id: 's1' }] }],
                },
            ],
        };
        const out = parseRelease(buildRelease(input));
        expect(out.label).toEqual({ name: 'Slingshot Records', url: 'https://x.test' });
        expect(out.tracks[0]?.previewStart).toBe(0);
        expect(out.tracks[0]?.participants?.[0]?.artistID).toEqual([{ type: 'spotify', id: 's1' }]);
    });

    test('throws SyntaxError on malformed XML', () => {
        expect(() => parseRelease('<release><track></release>')).toThrow(SyntaxError);
    });

    test('throws on an unknown element by default', () => {
        const xml = buildRelease(minimal).replace('</release>', '<mystery>1</mystery></release>');
        expect(() => parseRelease(xml)).toThrow(AudioSaladValidationError);
    });

    test('ignores unknown elements on request', () => {
        const xml = buildRelease(minimal).replace('</release>', '<mystery>1</mystery></release>');
        expect(parseRelease(xml, { onUnknownElement: 'ignore' }).title).toBe('Everything I Wanted');
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/api.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/api.ts`**

```ts
import { buildNode, parseNode } from './core/descriptor';
import { AudioSaladValidationError, type Issue } from './core/issues';
import type { XmlElement } from './core/node';
import { parseXml } from './core/parse';
import { type SerializeOptions, serialize } from './core/serialize';
import type { ReleaseInput } from './model';
import { RELEASE, ROOT_ATTRS } from './spec/v3_4';

export interface BuildOptions extends SerializeOptions {
    /**
     * Skip validation and emit whatever the input produces. Escaping still
     * applies unless `onIllegalChars` is `'strip'`. Default `true`.
     */
    validate?: boolean;
    /**
     * What to do with characters XML cannot represent. `'error'` reports an
     * issue; `'strip'` removes them. Default `'error'`.
     */
    onIllegalChars?: 'error' | 'strip';
}

export interface ParseOptions {
    /** What to do with elements the v3.4 schema does not define. Default `'error'`. */
    onUnknownElement?: 'error' | 'ignore';
}

const buildTree = (
    input: ReleaseInput,
    onIllegalChars: 'error' | 'strip',
): { node: XmlElement; issues: Issue[] } => {
    const issues: Issue[] = [];
    const bare = buildNode(RELEASE, input, 'release', { path: '', issues, onIllegalChars });
    return { node: { ...bare, attrs: ROOT_ATTRS }, issues };
};

/**
 * Validates a release without building XML. Never throws.
 *
 * @returns every problem found, with paths into the input object
 *   (`tracks[0].isrc`), or an empty array when the input is valid.
 */
export const validateRelease = (input: ReleaseInput): Issue[] =>
    buildTree(input, 'error').issues;

/**
 * Builds AudioSalad release XML conforming to schema v3.4.
 *
 * @throws {AudioSaladValidationError} when the input is invalid, carrying
 *   *every* issue rather than only the first. Pass `{ validate: false }` to
 *   emit regardless.
 */
export const buildRelease = (input: ReleaseInput, opts: BuildOptions = {}): string => {
    const { node, issues } = buildTree(input, opts.onIllegalChars ?? 'error');
    if (opts.validate !== false && issues.length > 0) {
        throw new AudioSaladValidationError(issues);
    }
    return serialize(node, opts);
};

/**
 * Parses AudioSalad release XML back into a typed input object.
 *
 * @throws {SyntaxError} when the document is not well-formed XML.
 * @throws {AudioSaladValidationError} when it contains elements outside
 *   schema v3.4, unless `{ onUnknownElement: 'ignore' }` is passed.
 */
export const parseRelease = (xml: string, opts: ParseOptions = {}): ReleaseInput => {
    const root = parseXml(xml);
    if (root.name !== 'release') {
        throw new SyntaxError(`expected a <release> root element, found <${root.name}>`);
    }
    const issues: Issue[] = [];
    const out = parseNode(RELEASE, root, {
        path: '',
        issues,
        onUnknownElement: opts.onUnknownElement ?? 'error',
    });
    if (issues.length > 0) throw new AudioSaladValidationError(issues);
    return out;
};

export { AudioSaladValidationError };
export type { Issue, IssueCode } from './core/issues';
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
bun test test/api.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/api.ts test/api.test.ts
git commit -m "feat: add buildRelease, validateRelease, and parseRelease"
```

---

## Task 11: Legacy facade classes

Replaces `src/types/*.ts` with thin classes over the core, preserving the 0.1.x surface. This is also where `bun run typecheck` becomes clean, since the old strict-mode-hostile files are deleted.

**Files:**
- Create: `src/legacy/classes.ts`, `src/legacy/sample.ts`, `test/legacy.test.ts`
- Modify: `src/index.ts`
- Delete: `src/types/` (everything except the enum files already moved in Task 6)

**Interfaces:**
- Consumes: the API (Task 10), models (Tasks 7–9), spec tables.
- Produces: `Release`, `Track`, `Participant`, `Asset`, `Attr`, `Permission`, `Territory`, `Text`, `Label`, `GenreType`, `PriceTier`, `ProprietaryID`, each with `.xml()` and `.validate()`. `Release.sample()`. `Delivery` is **not** produced.

- [ ] **Step 1: Write the failing tests**

`test/legacy.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
    Asset, Attr, GenreType, Label, Participant, Permission, PriceTier,
    ProprietaryID, Release, Territory, Text, Track,
} from '../src/legacy/classes';
import { ParticipantRole } from '../src/enums';

describe('Release facade', () => {
    test('constructs from a partial and emits XML', () => {
        const xml = new Release({
            action: 'add',
            title: 'T',
            displayArtist: 'A',
            tracks: [new Track({ trackNumber: 1, title: 'T', displayArtist: 'A' })],
        }).xml();
        expect(xml).toContain('<schema_id>audiosalad_release_v3.4</schema_id>');
    });

    test('validate() reports issues instead of throwing', () => {
        const r = new Release({ title: '', displayArtist: '', tracks: [] } as never);
        expect(r.validate().length).toBeGreaterThan(0);
    });

    test('sample() is valid', () => {
        expect(Release.sample().validate()).toEqual([]);
        expect(Release.sample().xml()).toContain('<display_artist>Billie Eilish</display_artist>');
    });

    test('sample() exercises artist_id, asset attr, and territory permission', () => {
        const xml = Release.sample().xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<file_name>');
        expect(xml).toContain('<territory>');
    });
});

describe('child facades', () => {
    test('each emits its own fragment', () => {
        expect(new Attr({ key: 'k', value: 'v' }).xml()).toContain('<attr>');
        expect(new Text({ content: 'c' }).xml()).toContain('<content>c</content>');
        expect(new Label({ name: 'L' }).xml()).toContain('<name>L</name>');
        expect(new GenreType({ primary: 'Pop' }).xml()).toContain('<primary>Pop</primary>');
        expect(new PriceTier({ type: 'iTunes', name: 'Mid' }).xml()).toContain('<price_tier>');
        expect(new Asset({ type: 'audio', fileName: 'a.wav' }).xml()).toContain('<asset>');
        expect(new Permission({ type: ['stream'], enabled: true }).xml()).toContain('<permission>');
        expect(new Territory({ countryCode: ['WW'] }).xml()).toContain('<country_code>WW</country_code>');
        expect(new Participant({ role: ParticipantRole.MainArtist, name: 'A' }).xml()).toContain('<role>');
    });

    // 0.1.x shipped ProprietaryID with no constructor, so it could not carry values.
    test('ProprietaryID takes a constructor object', () => {
        expect(new ProprietaryID({ type: 'spotify', id: 'x' }).xml()).toContain('<id>x</id>');
    });

    test('fragments carry no XML declaration', () => {
        expect(new Attr({ key: 'k', value: 'v' }).xml()).not.toContain('<?xml');
    });
});

describe('v3.4 breaking changes', () => {
    test('Delivery is gone', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        expect(mod.Delivery).toBeUndefined();
    });

    test('Permission.type is a list', () => {
        const xml = new Permission({ type: ['stream', 'download'], enabled: true }).xml();
        expect(xml.match(/<type>/g)).toHaveLength(2);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
bun test test/legacy.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/legacy/classes.ts`**

Every class follows one shape, so define it once with a factory.

```ts
import { buildNode } from '../core/descriptor';
import { AudioSaladValidationError, type Issue } from '../core/issues';
import { serialize } from '../core/serialize';
import type {
    AssetInput, AttrInput, GenreInput, LabelInput, ParticipantInput, PermissionInput,
    PriceTierInput, ProprietaryIdInput, ReleaseInput, TerritoryInput, TextInput, TrackInput,
} from '../model';
import {
    ASSET, ATTR, GENRE, LABEL, PARTICIPANT, PERMISSION, PRICE_TIER,
    PROPRIETARY_ID, RELEASE, ROOT_ATTRS, TERRITORY, TEXT, TRACK,
} from '../spec/v3_4';
import type { ComplexType } from '../core/descriptor';

/** Alias for a string, implying AudioSalad-compatible XML. */
export type AudioSaladXML = string;

interface FacadeOptions {
    /** Root elements carry namespace attributes and an XML declaration. */
    root?: boolean;
}

/**
 * Builds a class whose instances hold plain input fields, exactly as the
 * 0.1.x classes did, and delegate `.xml()` to the descriptor kernel.
 */
const facade = <I extends object>(
    type: ComplexType<I>,
    elName: string,
    { root = false }: FacadeOptions = {},
) =>
    class Facade {
        constructor(input: Partial<I>) {
            Object.assign(this, input);
        }

        /** Collects validation issues without throwing. */
        validate(): Issue[] {
            const issues: Issue[] = [];
            buildNode(type, this as unknown as I, elName, {
                path: '',
                issues,
                onIllegalChars: 'error',
            });
            return issues;
        }

        /**
         * Generates AudioSalad XML.
         *
         * @throws {AudioSaladValidationError} when the object is invalid.
         */
        xml(): AudioSaladXML {
            const issues: Issue[] = [];
            const node = buildNode(type, this as unknown as I, elName, {
                path: '',
                issues,
                onIllegalChars: 'error',
            });
            if (issues.length > 0) throw new AudioSaladValidationError(issues);
            return serialize(root ? { ...node, attrs: ROOT_ATTRS } : node, {
                xmlDeclaration: root,
            });
        }
    };

/** `attr_type` — a generic key/value pair. */
export const Attr = facade<AttrInput>(ATTR, 'attr');
export type Attr = InstanceType<typeof Attr> & AttrInput;

/** A proprietary participant ID, e.g. a Spotify or Apple artist ID. */
export const ProprietaryID = facade<ProprietaryIdInput>(PROPRIETARY_ID, 'artist_id');
export type ProprietaryID = InstanceType<typeof ProprietaryID> & ProprietaryIdInput;

/** `genre_type` — a genre at up to two levels of detail. */
export const GenreType = facade<GenreInput>(GENRE, 'genre');
export type GenreType = InstanceType<typeof GenreType> & GenreInput;

/** `price_tier_type` — a pricing tier for a download platform. */
export const PriceTier = facade<PriceTierInput>(PRICE_TIER, 'price_tier');
export type PriceTier = InstanceType<typeof PriceTier> & PriceTierInput;

/** `text_type` — descriptions, reviews, liner notes, or lyrics. */
export const Text = facade<TextInput>(TEXT, 'text');
export type Text = InstanceType<typeof Text> & TextInput;

/** `label_type` — the record label behind a release. */
export const Label = facade<LabelInput>(LABEL, 'label');
export type Label = InstanceType<typeof Label> & LabelInput;

/** `participant_type` — anyone involved in a recording or release. */
export const Participant = facade<ParticipantInput>(PARTICIPANT, 'participant');
export type Participant = InstanceType<typeof Participant> & ParticipantInput;

/** `asset_type` — an audio recording, artwork image, or arbitrary file. */
export const Asset = facade<AssetInput>(ASSET, 'asset');
export type Asset = InstanceType<typeof Asset> & AssetInput;

/** `permission_type` — a date- and region-bounded distribution permission. */
export const Permission = facade<PermissionInput>(PERMISSION, 'permission');
export type Permission = InstanceType<typeof Permission> & PermissionInput;

/** `territory_type` — a release's or track's presence in a place. */
export const Territory = facade<TerritoryInput>(TERRITORY, 'territory');
export type Territory = InstanceType<typeof Territory> & TerritoryInput;

/** `track_type` — a single audio track within a release. */
export const Track = facade<TrackInput>(TRACK, 'track');
export type Track = InstanceType<typeof Track> & TrackInput;

const ReleaseBase = facade<ReleaseInput>(RELEASE, 'release', { root: true });

/** The `release` root element. */
export class Release extends ReleaseBase {
    /** A fully populated example, useful for testing an integration. */
    static sample(): Release {
        return new Release(SAMPLE_RELEASE);
    }
}
/** Declaration merging gives instances the input fields as public properties. */
export interface Release extends ReleaseInput {}
```

Add `import { SAMPLE_RELEASE } from './sample';` to the import block. `sample.ts`
imports only enums and model types, never `classes.ts`, so there is no cycle.

- [ ] **Step 4: Implement `src/legacy/sample.ts`**

Write this file *before* running the tests, since `classes.ts` imports it.

`src/legacy/sample.ts`:

```ts
import { Action, CountryCode, CountryName, Genre, iTunesPriceTier, ParticipantRole, ReleaseFormat, ReleaseTextType, SubGenre, TrackTextType } from '../enums';
import { AttributeType } from '../enums/attr';
import type { ReleaseInput } from '../model';

/**
 * A fully populated release exercising every element group, including the
 * three that 0.1.x silently dropped: participant `artist_id`, asset `attr`,
 * and territory `permission`.
 */
export const SAMPLE_RELEASE: ReleaseInput = {
    distributorName: 'Slingshot Records',
    exportID: 'abc123',
    exportTime: '2020-05-02T00:00:00Z',
    action: Action.Add,
    upc: '123456789012',
    vendorReleaseID: 'xyz123',
    catalogID: 'SS-TST-01',
    series: 'Test Collection',
    title: 'Everything I Wanted',
    titleVersion: 'Slingshot Remix',
    advisory: 'explicit',
    metadataLanguage: 'English',
    audioLanguage: 'English',
    displayArtist: 'Billie Eilish',
    participants: [
        {
            role: ParticipantRole.MainArtist,
            name: 'Billie Eilish',
            primary: true,
            artistID: [{ type: 'spotify', id: '6qqNVTkY8uBg9cP3Jd7DAH' }],
        },
        { role: ParticipantRole.SongWriter, name: "Finneas O'Connell", primary: false },
    ],
    compilation: false,
    originalReleaseDate: '2020-05-02',
    releaseDate: '2020-05-02',
    releaseFormat: ReleaseFormat.Single,
    recordingLocation: CountryCode.UnitedStates,
    url: 'https://billieeilish.com',
    genres: [{ primary: Genre.Pop }, { primary: Genre.Pop, sub: SubGenre.PopAdultContemporary }],
    tags: ['new', 'billie eilish', 'alternative'],
    notes: 'This is a test of the library',
    texts: [
        {
            type: ReleaseTextType.LinerNotes,
            language: 'English',
            content: 'Recorded at Slingshot Studios in Beverly Hills',
        },
    ],
    cInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
    cYear: 2020,
    pInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
    pYear: 2020,
    rightsHolders: 'Billie Eilish, Slingshot Media',
    label: {
        vendorLabelID: '1',
        name: 'Slingshot Records',
        city: 'Beverly Hills',
        state: 'California',
        country: CountryName.UnitedStates,
        url: 'https://slingshot.fm',
        notes: 'Sample label record',
    },
    priceTiers: [{ type: 'iTunes', name: iTunesPriceTier.Mid }],
    permissions: [
        {
            type: ['preorder'],
            enabled: false,
            startDate: '2021-01-01T00:00:00Z',
            endDate: '2021-12-31T00:00:00Z',
            attr: [{ type: AttributeType.String, key: 'note', value: 'sample' }],
            countryCode: [CountryCode.Antarctica],
        },
    ],
    globalReleaseDate: '2020-05-02T21:00:00Z',
    territories: [
        {
            countryCode: [CountryCode.Worldwide],
            releaseDate: '2020-05-02T00:00:00Z',
            permissions: [{ type: ['stream', 'download'], enabled: true }],
        },
    ],
    assets: [
        {
            type: 'image',
            subtype: 'Front',
            name: 'Cover art',
            format: 'jpg',
            mimeType: 'image/jpeg',
            md5Checksum: '03a43f76d3e52c8a4cf24fd1d8d05911',
            fileName: 'cover-art.jpg',
            attr: [{ type: AttributeType.String, key: 'source', value: 'label' }],
        },
    ],
    tracks: [
        {
            vendorTrackID: 'aaa111',
            isrc: 'QM7G92017457',
            discNumber: 1,
            trackNumber: 1,
            title: 'Everything I Wanted',
            trackLength: 181,
            advisory: 'explicit',
            audioLanguage: 'English',
            bpm: 120,
            previewStart: 0,
            previewDuration: 30,
            displayArtist: 'Billie Eilish',
            participants: [
                { role: ParticipantRole.MainArtist, name: 'Billie Eilish', primary: true },
                { role: ParticipantRole.SongWriter, name: "Finneas O'Connell", primary: false },
            ],
            texts: [
                {
                    type: TrackTextType.Lyrics,
                    language: 'English',
                    content: "As long as I'm here\nNo one can hurt you",
                },
            ],
            cInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
            cYear: 2020,
            pInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
            pYear: 2020,
            rightsHolders: 'Billie Eilish, Slingshot Media',
            assets: [
                {
                    type: 'audio',
                    subtype: 'flac',
                    name: 'Everything I Wanted',
                    format: 'flac',
                    mimeType: 'audio/flac',
                    md5Checksum: '4cf2392db7ccd6c9b663f8a4da42f9cb',
                    fileName: 'everything-i-wanted.flac',
                },
            ],
            attr: [{ type: AttributeType.String, key: 'ss_id', value: 'test1234' }],
        },
    ],
    attr: [{ type: AttributeType.String, key: 'ss_id', value: '1234test' }],
};
```

> `previewStart: 0` in the sample is deliberate. It is the value 0.1.x dropped, so the golden file in Task 12 pins the fix.

- [ ] **Step 5: Delete the old type modules and rewrite the barrel**

```bash
git rm -q -r src/types
```

`src/index.ts`:

```ts
export { buildRelease, validateRelease, parseRelease, AudioSaladValidationError } from './api';
export type { BuildOptions, ParseOptions } from './api';
export type { Issue, IssueCode } from './core/issues';
export type { DateLike } from './core/datetime';

export type {
    AssetInput, AttrInput, GenreInput, LabelInput, ParticipantInput, PermissionInput,
    PriceTierInput, ProprietaryIdInput, ReleaseInput, TerritoryInput, TextInput, TrackInput,
} from './model';

export { SCHEMA_ID, SCHEMA_NAMESPACE, SCHEMA_LOCATION } from './spec/v3_4/facets';

export {
    Action, AttributeType, CountryCode, CountryName, Genre, SubGenre,
    ParticipantRole, iTunesPriceTier, ReleaseFormat, ReleaseTextType, TrackTextType,
} from './enums';

export {
    Asset, Attr, GenreType, Label, Participant, Permission, PriceTier,
    ProprietaryID, Release, Territory, Text, Track,
} from './legacy/classes';
export type { AudioSaladXML } from './legacy/classes';
```

- [ ] **Step 6: Run the full suite and the typecheck**

```bash
bun test
bun run typecheck
bun run lint
```

Expected: all PASS. `bun run typecheck` is now clean, since `src/types/` is gone.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: reimplement the class API as a facade over the core

Every class keeps its 0.1.x constructor and .xml(), and gains .validate().
ProprietaryID gains the constructor it never had. Delivery is removed:
dsp_delivery no longer exists in schema v3.4.

BREAKING CHANGE: Delivery and Release.dspDeliveries are removed, and
Permission.type is now a string array."
```

---

## Task 12: XSD validation harness and golden files

**Files:**
- Create: `test/helpers/xsd.ts`, `test/fixtures.ts`, `test/golden.test.ts`, `test/golden/*.xml` (generated)

**Interfaces:**
- Consumes: `buildRelease` (Task 10), `SAMPLE_RELEASE` (Task 11), `schemas/audiosalad_release_v3.4.xsd` (Task 1).
- Produces: `expectValidAgainstXsd(xml: string): Promise<void>`, and `FIXTURES: ReadonlyArray<{ name: string; input: ReleaseInput }>`.

> **Verified beforehand:** `xmllint-wasm` v5.3.0 runs correctly under `bun test`. Its `errors` array interleaves libxml warnings and caret context lines, so the helper filters on `/Schemas validity error/`. The AudioSalad namespace is not an absolute URI, which produces a harmless `namespace warning` on every run — that is why filtering, rather than checking `errors.length`, is required.

- [ ] **Step 1: Write the helper**

`test/helpers/xsd.ts`:

```ts
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
```

- [ ] **Step 2: Write the fixture set**

`test/fixtures.ts`:

```ts
import { SAMPLE_RELEASE } from '../src/legacy/sample';
import type { ReleaseInput } from '../src/model';

const minimal: ReleaseInput = {
    action: 'add',
    title: 'Minimal',
    displayArtist: 'Nobody',
    tracks: [{ trackNumber: 1, title: 'Only Track', displayArtist: 'Nobody' }],
};

const unicode: ReleaseInput = {
    action: 'update',
    title: '勝訴ストリップ',
    displayArtist: '椎名林檎',
    metadataLanguage: 'Japanese',
    notes: 'Emoji \u{1F3B5}, accents é, quote "x" & ampersand <tag>',
    texts: [{ type: 'Liner Notes', language: 'Japanese', content: 'line one\nline two\n\tindented' }],
    tracks: [
        {
            trackNumber: 1,
            title: '正しい街',
            displayArtist: '椎名林檎',
            texts: [{ type: 'Lyrics', content: "It's <b>bold</b> & \"quoted\"" }],
        },
    ],
};

const multiDisc: ReleaseInput = {
    action: 'add',
    title: 'Two Discs',
    displayArtist: 'Someone',
    releaseFormat: 'double album',
    upc: '12345678901234',
    tracks: [
        { discNumber: 1, trackNumber: 1, title: 'A1', displayArtist: 'Someone', previewStart: 0 },
        { discNumber: 1, trackNumber: 2, title: 'A2', displayArtist: 'Someone' },
        { discNumber: 2, trackNumber: 1, title: 'B1', displayArtist: 'Someone' },
    ],
};

const multiTerritory: ReleaseInput = {
    action: 'full-update',
    title: 'Wide Release',
    displayArtist: 'Someone',
    permissions: [
        { type: ['preorder'], enabled: true, countryCode: ['US', 'CA'] },
    ],
    territories: [
        { countryCode: ['US', 'CA'], releaseDate: '2020-05-02T00:00:00Z' },
        {
            countryCode: ['JP'],
            releaseDate: '2020-05-09T00:00:00Z',
            permissions: [{ type: ['stream', 'download'], enabled: true }],
        },
    ],
    tracks: [{ trackNumber: 1, title: 'T', displayArtist: 'Someone' }],
};

/** Every fixture is serialized to a golden file and validated against the XSD. */
export const FIXTURES: ReadonlyArray<{ name: string; input: ReleaseInput }> = [
    { name: 'minimal', input: minimal },
    { name: 'sample', input: SAMPLE_RELEASE },
    { name: 'unicode', input: unicode },
    { name: 'multi-disc', input: multiDisc },
    { name: 'multi-territory', input: multiTerritory },
];
```

- [ ] **Step 3: Write the failing golden test**

`test/golden.test.ts`:

```ts
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
                // Set UPDATE_GOLDEN=1 to regenerate after an intentional change.
                if (process.env.UPDATE_GOLDEN === '1' || !existsSync(path)) {
                    writeFileSync(path, xml);
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
```

- [ ] **Step 4: Generate the golden files and run**

```bash
mkdir -p test/golden
UPDATE_GOLDEN=1 bun test test/golden.test.ts
bun test test/golden.test.ts
```

Expected: PASS, 16 tests. Read the generated `test/golden/sample.xml` and confirm by eye that `<artist_id>`, `<preview_start>0</preview_start>`, the asset `<attr>`, and the territory `<permission>` are all present — the four things 0.1.x dropped.

- [ ] **Step 5: Commit**

```bash
git add test/helpers test/fixtures.ts test/golden.test.ts test/golden
git commit -m "test: add XSD validation harness and golden fixtures

Validates every fixture against the bundled v3.4 schema with xmllint-wasm,
replacing validate-with-xmllint's dependency on a system binary."
```

---

## Task 13: Round-trip property tests

**Files:**
- Create: `test/property.test.ts`

**Interfaces:**
- Consumes: `buildRelease`, `parseRelease`, `validateRelease` (Task 10); `expectValidAgainstXsd` (Task 12).
- Produces: nothing consumed by later tasks.

> **Why `build(parse(build(x))) === build(x)` and not `parse(build(x)) === x`.** A `Date` input necessarily comes back as a formatted string, and absent optional keys come back absent rather than `undefined`. The build-normalized form is the fixed point, so that is what the property asserts.

- [ ] **Step 1: Write the test**

`test/property.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import fc from 'fast-check';
import { buildRelease, parseRelease, validateRelease } from '../src/api';
import type { ReleaseInput } from '../src/model';
import { expectValidAgainstXsd } from './helpers/xsd';

/** Text that is safe for XML: no control characters, no lone surrogates. */
const xmlSafeString = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => !/[^\u{9}\u{A}\u{D}\u{20}-\u{D7FF}\u{E000}-\u{FFFD}\u{10000}-\u{10FFFF}]/u.test(s))
    .filter((s) => s.trim().length > 0);

const countryCode = fc.constantFrom('WW', 'US', 'CA', 'GB', 'JP', 'DE', 'AQ');

const isrc = fc
    .tuple(
        fc.stringMatching(/^[A-Z0-9]{5}$/),
        fc.stringMatching(/^[0-9]{2}$/),
        fc.stringMatching(/^[A-Z0-9]{5}$/),
    )
    .map(([a, b, c]) => `${a}${b}${c}`);

const attrArb = fc.record({ key: xmlSafeString, value: xmlSafeString });

const participantArb = fc.record(
    {
        role: fc.constantFrom('Main Artist', 'Producer', 'Song Writer'),
        name: xmlSafeString,
        primary: fc.boolean(),
        artistID: fc.array(fc.record({ type: xmlSafeString, id: xmlSafeString }), { maxLength: 2 }),
    },
    { requiredKeys: ['role', 'name'] },
);

const trackArb = fc.record(
    {
        trackNumber: fc.integer({ min: 1, max: 99 }),
        title: xmlSafeString,
        displayArtist: xmlSafeString,
        discNumber: fc.integer({ min: 1, max: 5 }),
        trackLength: fc.integer({ min: 0, max: 7200 }),
        bpm: fc.integer({ min: 0, max: 300 }),
        previewStart: fc.integer({ min: 0, max: 600 }),
        isrc,
        advisory: fc.constantFrom('none', 'clean', 'explicit'),
        tags: fc.array(xmlSafeString, { maxLength: 3 }),
        texts: fc.array(fc.record({ content: xmlSafeString }), { maxLength: 2 }),
        participants: fc.array(participantArb, { maxLength: 3 }),
        attr: fc.array(attrArb, { maxLength: 2 }),
    },
    { requiredKeys: ['trackNumber', 'title', 'displayArtist'] },
);

const releaseArb: fc.Arbitrary<ReleaseInput> = fc.record(
    {
        action: fc.constantFrom('add', 'update', 'full-update', 'meta-update', 'delete'),
        title: xmlSafeString,
        displayArtist: xmlSafeString,
        tracks: fc.array(trackArb, { minLength: 1, maxLength: 4 }),
        distributorName: xmlSafeString,
        upc: fc.stringMatching(/^[0-9]{12,14}$/),
        compilation: fc.boolean(),
        releaseFormat: fc.constantFrom('single', 'album', 'ep', 'dj mix'),
        recordingLocation: countryCode,
        cYear: fc.integer({ min: 1000, max: 9999 }),
        genres: fc.array(fc.record({ primary: xmlSafeString }), { maxLength: 2 }),
        tags: fc.array(xmlSafeString, { maxLength: 3 }),
        label: fc.record({ name: xmlSafeString }),
        territories: fc.array(
            fc.record({ countryCode: fc.array(countryCode, { minLength: 1, maxLength: 3 }) }),
            { maxLength: 2 },
        ),
        permissions: fc.array(
            fc.record({
                type: fc.array(fc.constantFrom('stream', 'download', 'preorder'), { minLength: 1, maxLength: 3 }),
                enabled: fc.boolean(),
            }),
            { maxLength: 2 },
        ),
        attr: fc.array(attrArb, { maxLength: 2 }),
    },
    { requiredKeys: ['action', 'title', 'displayArtist', 'tracks'] },
);

describe('properties', () => {
    test('every generated release validates', () => {
        fc.assert(
            fc.property(releaseArb, (input) => {
                expect(validateRelease(input)).toEqual([]);
            }),
            { numRuns: 300 },
        );
    });

    test('build is a fixed point of parse', () => {
        fc.assert(
            fc.property(releaseArb, (input) => {
                const once = buildRelease(input);
                expect(buildRelease(parseRelease(once))).toBe(once);
            }),
            { numRuns: 300 },
        );
    });

    test('generated documents satisfy the XSD', async () => {
        await fc.assert(
            fc.asyncProperty(releaseArb, async (input) => {
                await expectValidAgainstXsd(buildRelease(input));
            }),
            { numRuns: 40 },
        );
    });
});

describe('parser robustness', () => {
    test('never hangs or returns a non-Error on arbitrary input', () => {
        fc.assert(
            fc.property(fc.string({ maxLength: 200 }), (s) => {
                try {
                    parseRelease(s);
                } catch (e) {
                    expect(e).toBeInstanceOf(Error);
                }
            }),
            { numRuns: 500 },
        );
    });
});
```

- [ ] **Step 2: Run the tests**

```bash
bun test test/property.test.ts
```

Expected: PASS, 4 tests. If a counterexample surfaces, fast-check prints the shrunk input — fix the underlying bug rather than narrowing the arbitrary.

- [ ] **Step 3: Commit**

```bash
git add test/property.test.ts
git commit -m "test: add round-trip and XSD property tests"
```

---

## Task 14: Defect regression suite

A single file naming each 0.1.x defect, so a future change that reintroduces one fails against a test that explains what it was.

**Files:**
- Create: `test/regressions.test.ts`

**Interfaces:**
- Consumes: the public API and facade classes.
- Produces: nothing.

- [ ] **Step 1: Write the test**

`test/regressions.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { buildRelease, validateRelease } from '../src/api';
import { Asset, Participant, Release, Territory, Track } from '../src/legacy/classes';
import type { ReleaseInput } from '../src/model';

const base: ReleaseInput = {
    action: 'add',
    title: 'T',
    displayArtist: 'A',
    tracks: [{ trackNumber: 1, title: 'T', displayArtist: 'A' }],
};

describe('0.1.x regressions', () => {
    test('defect 1: participant artist_id is emitted', () => {
        const xml = new Participant({
            role: 'Main Artist',
            name: 'A',
            artistID: [{ type: 'spotify', id: 's1' }],
        }).xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<id>s1</id>');
    });

    test('defect 2: asset attr is emitted', () => {
        const xml = new Asset({
            type: 'audio',
            fileName: 'a.wav',
            attr: [{ key: 'k', value: 'v' }],
        }).xml();
        expect(xml).toContain('<attr>');
        expect(xml).toContain('<key>k</key>');
    });

    test('defect 3: territory permission is emitted', () => {
        const xml = new Territory({
            countryCode: ['WW'],
            permissions: [{ type: ['stream'], enabled: true }],
        }).xml();
        expect(xml).toContain('<permission>');
    });

    test('defect 4: a numeric zero is not dropped', () => {
        const xml = new Track({
            trackNumber: 1,
            title: 'T',
            displayArtist: 'A',
            previewStart: 0,
            bpm: 0,
            trackLength: 0,
        }).xml();
        expect(xml).toContain('<preview_start>0</preview_start>');
        expect(xml).toContain('<bpm>0</bpm>');
        expect(xml).toContain('<track_length>0</track_length>');
    });

    test('defect 4b: a false boolean is not dropped', () => {
        expect(buildRelease({ ...base, compilation: false })).toContain(
            '<compilation>false</compilation>',
        );
    });

    test('defect 5: XML-illegal characters are refused, not emitted', () => {
        const bad = { ...base, title: `Bad${String.fromCharCode(7)}Title` };
        expect(validateRelease(bad)[0]).toMatchObject({ path: 'title', code: 'illegalChar' });
        expect(() => buildRelease(bad)).toThrow();
        expect(buildRelease(bad, { onIllegalChars: 'strip' })).toContain('<title>BadTitle</title>');
    });

    test('defect 6: a UTC date is not shifted by a day', () => {
        const xml = buildRelease({ ...base, releaseDate: new Date(Date.UTC(2020, 4, 2, 23, 30)) });
        expect(xml).toContain('<release_date>2020-05-02</release_date>');
    });

    test('defect 7: the public barrel loads and exports values', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        expect(typeof mod.buildRelease).toBe('function');
        expect(typeof mod.Release).toBe('function');
    });

    test('defect 8: the suite actually asserts — a broken release throws', () => {
        expect(() => buildRelease({ ...base, tracks: [] })).toThrow();
    });

    test('multi-line text is not collapsed', () => {
        const xml = buildRelease({
            ...base,
            texts: [{ type: 'Liner Notes', content: 'one\ntwo\nthree' }],
        });
        expect(xml).toContain('one\ntwo\nthree');
    });

    test('Release.sample() exercises all four previously dropped paths', () => {
        const xml = Release.sample().xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<preview_start>0</preview_start>');
        expect(xml.match(/<attr>/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
        expect(xml).toContain('<territory>');
    });
});
```

- [ ] **Step 2: Run the full suite**

```bash
bun test
bun run typecheck
bun run lint
```

Expected: everything PASS.

- [ ] **Step 3: Commit**

```bash
git add test/regressions.test.ts
git commit -m "test: add a named regression per 0.1.x defect"
```

---

## Task 15: Git hooks and commit linting

**Files:**
- Create: `lefthook.yml`, `commitlint.config.js`, `scripts/size.ts`

**Interfaces:**
- Consumes: the build from Task 1.
- Produces: a `commit-msg` hook rejecting non-conventional messages; `bun run size`.

- [ ] **Step 1: Create `commitlint.config.js`**

```js
/** @type {import('@commitlint/types').UserConfig} */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'body-max-line-length': [0, 'always'],
        'type-enum': [
            2,
            'always',
            ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'],
        ],
    },
};
```

> `body-max-line-length` is disabled because changesets writes long release bodies, and the bot's commit must pass the same hook as everyone else's.

- [ ] **Step 2: Create `lefthook.yml`**

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: biome
      glob: '*.{ts,js,json,jsonc}'
      run: bunx biome check --write --no-errors-on-unmatched {staged_files}
      stage_fixed: true

pre-push:
  jobs:
    - name: typecheck
      run: bun run typecheck
    - name: test
      run: bun test

commit-msg:
  jobs:
    - name: commitlint
      run: bunx commitlint --edit {1}
```

- [ ] **Step 3: Create the dependency-free size guard `scripts/size.ts`**

```ts
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';

/** Budget in bytes for the gzipped ESM bundle. Raise deliberately, never casually. */
const LIMIT_GZIP = 12 * 1024;

const path = 'dist/index.js';
const raw = statSync(path).size;
const gzip = gzipSync(readFileSync(path)).byteLength;

const kb = (n: number): string => `${(n / 1024).toFixed(2)} KB`;
console.log(`${path}: ${kb(raw)} raw, ${kb(gzip)} gzipped (budget ${kb(LIMIT_GZIP)})`);

if (gzip > LIMIT_GZIP) {
    console.error(`Bundle exceeds the gzip budget by ${kb(gzip - LIMIT_GZIP)}.`);
    process.exit(1);
}
```

- [ ] **Step 4: Install the hooks and verify each one**

```bash
bunx lefthook install
bun run build && bun run size
```

Expected: the size script prints a figure well under budget and exits 0.

Verify the commit-msg hook rejects a bad message and accepts a good one:

```bash
git commit --allow-empty -m "bad message" && echo "HOOK FAILED TO BLOCK" || echo "hook blocked as expected"
git commit --allow-empty -m "chore: verify commitlint hook" && git reset --hard HEAD~1
```

Expected: the first is rejected; the second succeeds.

- [ ] **Step 5: Add a `prepare` script so hooks install on clone**

Add to `package.json` scripts:

```json
    "prepare": "lefthook install || true"
```

> The `|| true` keeps `npm install` of the published tarball from failing in a consumer's environment, where lefthook is not present.

- [ ] **Step 6: Commit**

```bash
git add lefthook.yml commitlint.config.js scripts/size.ts package.json
git commit -m "ci: enforce conventional commits and a bundle size budget"
```

---

## Task 16: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`
- Delete: `.github/workflows/main.yml`, `.github/workflows/size.yml`

**Interfaces:**
- Consumes: the scripts from Tasks 1 and 15.
- Produces: a green CI run on every push and pull request.

- [ ] **Step 1: Delete the old workflows**

```bash
git rm -q .github/workflows/main.yml .github/workflows/size.yml
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  check:
    name: Lint and typecheck
    runs-on: namespace-profile-default
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - name: Lint
        run: bun run lint
      - name: Typecheck
        run: bun run typecheck

  test:
    name: Test
    runs-on: namespace-profile-default
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - name: Test with coverage
        run: bun test --coverage

  build:
    name: Build and package checks
    runs-on: namespace-profile-default
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - name: Build
        run: bun run build
      - name: Bundle size budget
        run: bun run size
      - name: Validate published package
        run: bun run check:exports

  commits:
    name: Conventional commits
    runs-on: namespace-profile-default
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - name: Lint commit messages in this PR
        run: |
          bunx commitlint \
            --from "${{ github.event.pull_request.base.sha }}" \
            --to "${{ github.event.pull_request.head.sha }}" \
            --verbose
```

> `bun-version-file: package.json` makes `setup-bun` read the pinned `packageManager` field, so CI and local development cannot drift.

- [ ] **Step 3: Create `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
    commit-message:
      prefix: ci

  - package-ecosystem: npm
    directory: /
    schedule:
      interval: monthly
    commit-message:
      prefix: build
      prefix-development: build
    groups:
      dev-dependencies:
        dependency-type: development
```

> The `commit-message.prefix` settings keep Dependabot's own commits conventional, so they pass the `commits` job.

- [ ] **Step 4: Verify the workflow locally as far as possible**

```bash
bun install --frozen-lockfile
bun run lint && bun run typecheck && bun test && bun run build && bun run size && bun run check:exports
```

Expected: every step passes. `check:exports` in particular must report no problems from `publint` or `attw`.

- [ ] **Step 5: Commit**

```bash
git add .github
git commit -m "ci: replace the node matrix workflow with bun on namespace runners"
```

---

## Task 17: Changesets and the release workflow

**Files:**
- Create: `.changeset/config.json`, `.changeset/initial-1-0.md`, `.github/workflows/release.yml`

**Interfaces:**
- Consumes: the `version` and `release` scripts from Task 1.
- Produces: an automated "Version Packages" PR and npm publish on merge.

- [ ] **Step 1: Initialize changesets**

```bash
bunx changeset init
```

Then replace `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "slingshot/audiosalad-xml" }],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 2: Write the 1.0.0 changeset**

`.changeset/initial-1-0.md`:

```markdown
---
'@ssh/audiosalad-xml': major
---

Rebuild the library around AudioSalad schema v3.4, with validation and parsing.

**Breaking**

- `Delivery` and `Release.dspDeliveries` are removed. `dsp_delivery` no longer
  exists in schema v3.4; pin `0.1.x` if you deliver to a v3.2 endpoint.
- `Permission.type` is now `string[]`. The schema widened `permission/type` to
  `maxOccurs="unbounded"`.
- Output targets the `audiosalad_release_v3.4` namespace and `schema_id`.
- Invalid input now throws `AudioSaladValidationError` instead of emitting XML
  that AudioSalad would reject on ingest. Call `validateRelease` first, or pass
  `{ validate: false }`.
- `buildRelease` emits an XML declaration by default; pass
  `{ xmlDeclaration: false }` for the previous behaviour.
- Optional booleans are emitted when `false`; multi-line text is no longer
  collapsed.
- Node 20 or later is required.

**Fixed**

- `participant/artist_id`, `asset/attr`, and `territory/permission` were built
  with `forEach` and never reached the output.
- Numeric fields used falsy guards, so a legitimate `0` — notably
  `preview_start` — was dropped.
- Control characters were emitted unescaped, producing unparseable documents.
- Dates were converted through UTC implicitly and could shift by a day.
- The package could not be loaded by any modern bundler, because a type was
  re-exported as a value.
- The test suite asserted nothing.

**Added**

- `buildRelease`, `validateRelease`, and `parseRelease`, with structured issues
  carrying input paths.
- `.validate()` on every class.
- `label/url` and `label/notes`, present in the schema but previously absent.
- `ReleaseFormat.DJMix`, `ParticipantRole.PrimaryArtist`, and
  `ParticipantRole.Publisher`.
- Zero runtime dependencies: `xml-escape` and `xml-formatter` are gone.
```

- [ ] **Step 3: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Version or publish
    runs-on: namespace-profile-default
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json

      # npm's CLI implements provenance attestation, so it is what publishes,
      # even though bun manages dependencies.
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org

      - run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Create a version PR or publish
        uses: changesets/action@v1
        with:
          version: bun run version
          publish: bun run release
          title: 'chore(release): version packages'
          commit: 'chore(release): version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: 'true'
```

> `title` and `commit` are set explicitly so the bot's own release commit is conventional and passes the `commits` CI job.

- [ ] **Step 4: Verify the changeset is well-formed**

```bash
bunx changeset status --verbose
```

Expected: reports `@ssh/audiosalad-xml` with a `major` bump to `1.0.0`.

- [ ] **Step 5: Commit**

```bash
git add .changeset .github/workflows/release.yml
git commit -m "ci: add changesets and an automated release workflow"
```

- [ ] **Step 6: Record the manual preconditions**

These need repository-owner action and cannot be done from here. Add them to `AGENTS.md` in Task 19 and report them at the end:

1. Add an `NPM_TOKEN` repository secret (an npm automation token with publish rights to `@ssh`).
2. In **Settings → Actions → General**, allow GitHub Actions to create and approve pull requests.
3. npm provenance requires a public repository — confirm before the first publish, or drop `NPM_CONFIG_PROVENANCE` and `publishConfig.provenance`.

---

## Task 18: API docs workflow

**Files:**
- Create: `typedoc.json`, `.github/workflows/docs.yml`
- Delete: the generated typedoc output currently committed under `docs/`

**Interfaces:**
- Consumes: the build from Task 1.
- Produces: `bun run docs` writing to `api-docs/`, and a Pages deployment.

- [ ] **Step 1: Remove the committed typedoc output, keeping the specs**

```bash
git rm -q -r docs/assets docs/classes docs/enums
git rm -q docs/index.html docs/modules.html
```

> `docs/superpowers/` holds the design spec and this plan. It must survive.

- [ ] **Step 2: Create `typedoc.json`**

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "api-docs",
  "name": "@ssh/audiosalad-xml",
  "readme": "README.md",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "navigationLinks": {
    "GitHub": "https://github.com/slingshot/audiosalad-xml",
    "npm": "https://www.npmjs.com/package/@ssh/audiosalad-xml"
  }
}
```

- [ ] **Step 3: Create `.github/workflows/docs.yml`**

```yaml
name: Docs

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: pages
  cancel-in-progress: false

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    name: Build API docs
    runs-on: namespace-profile-default
    steps:
      - uses: actions/checkout@v5
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: package.json
      - run: bun install --frozen-lockfile
      - name: Generate typedoc
        run: bun run docs
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: api-docs

  deploy:
    name: Deploy to GitHub Pages
    needs: build
    runs-on: namespace-profile-default
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify docs generation locally**

```bash
bun run docs
ls api-docs/index.html
```

Expected: the file exists, and `api-docs/` is gitignored (added in Task 1).

- [ ] **Step 5: Commit**

```bash
git add typedoc.json .github/workflows/docs.yml
git add -u docs
git commit -m "docs: generate and deploy API docs from CI

Stops committing typedoc output to the repository. Requires the Pages
source to be switched to GitHub Actions in repository settings."
```

---

## Task 19: README, AGENTS.md, and the migration guide

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md` (symlink)
- Modify: `README.md`

**Interfaces:**
- Consumes: everything.
- Produces: the documentation a new contributor or coding agent needs.

- [ ] **Step 1: Rewrite `README.md`**

```markdown
# audiosalad-xml

Build, validate, and parse [AudioSalad](https://audiosalad.com) release XML from
TypeScript. Targets schema **v3.4**. Zero runtime dependencies.

```sh
bun add @ssh/audiosalad-xml   # or npm / pnpm / yarn
```

## Quickstart

```ts
import { buildRelease } from '@ssh/audiosalad-xml';

const xml = buildRelease({
    action: 'add',
    title: 'Everything I Wanted',
    displayArtist: 'Billie Eilish',
    upc: '123456789012',
    releaseDate: '2020-05-02',
    tracks: [
        {
            trackNumber: 1,
            title: 'Everything I Wanted',
            displayArtist: 'Billie Eilish',
            isrc: 'QM7G92017457',
            trackLength: 181,
            assets: [{ type: 'audio', format: 'flac', fileName: 'eiw.flac' }],
        },
    ],
});
```

Invalid input throws `AudioSaladValidationError`, carrying every problem at once:

```ts
import { AudioSaladValidationError, buildRelease } from '@ssh/audiosalad-xml';

try {
    buildRelease(input);
} catch (e) {
    if (e instanceof AudioSaladValidationError) {
        for (const { path, code, message } of e.issues) {
            console.error(`${path} [${code}]: ${message}`);
            // tracks[0].isrc [pattern]: "NOPE" does not match …
        }
    }
}
```

To check without throwing, use `validateRelease`, which returns the same issues
and never throws.

## Parsing

```ts
import { parseRelease } from '@ssh/audiosalad-xml';

const input = parseRelease(xml);   // -> ReleaseInput
```

Malformed XML throws `SyntaxError`. Elements outside schema v3.4 throw
`AudioSaladValidationError`; pass `{ onUnknownElement: 'ignore' }` to discard them.

## Options

| Option | Default | Effect |
|---|---|---|
| `xmlDeclaration` | `true` | Emit `<?xml version="1.0" encoding="UTF-8"?>` |
| `indent` | `'    '` | Indent string, or `false` for one line |
| `validate` | `true` | Set `false` to emit without validating |
| `onIllegalChars` | `'error'` | `'strip'` removes characters XML cannot represent |

## Dates

Every date field accepts a `Date` or a string. **A `Date` is always formatted in
UTC.** Pass a string when you need exact control:

```ts
{ releaseDate: new Date(Date.UTC(2020, 4, 2)) }   // -> 2020-05-02
{ releaseDate: '2020-05-02' }                     // -> 2020-05-02
{ originalReleaseDate: '2019' }                   // partial dates are allowed
```

## Class API

The 0.1.x classes still work, and each now has `.validate()`:

```ts
import { Release, Track } from '@ssh/audiosalad-xml';

const release = new Release({ /* … */ tracks: [new Track({ /* … */ })] });
release.validate();   // Issue[]
release.xml();        // string
Release.sample();     // a fully populated example
```

## Upgrading from 0.1.x

| Change | What to do |
|---|---|
| `Delivery` / `Release.dspDeliveries` removed | `dsp_delivery` was deleted from the schema in v3.4. Pin `0.1.x` if you still deliver to a v3.2 endpoint. |
| `Permission.type` is now `string[]` | `type: 'stream'` becomes `type: ['stream']` |
| Invalid input throws | Call `validateRelease` first, or pass `{ validate: false }` |
| XML declaration is emitted | Pass `{ xmlDeclaration: false }` to restore the old output |
| `compilation: false` is now emitted | Omit the key entirely for absence |
| Multi-line text is no longer collapsed | Output is verbatim; no action needed |
| Node 20+ required | Upgrade your runtime |

Four element groups that 0.1.x silently dropped now appear in the output:
`participant/artist_id`, `asset/attr`, `territory/permission`, and any numeric
field whose value is `0`. **Diff your generated XML before deploying.**

## What changed in schema v3.4

`dsp_delivery` was removed; `permission/type` became unbounded and gained
`attr`; `asset/md5_checksum` became optional; `upc_ean` accepts 14 characters;
and `DJ Mix` joined the release formats.

## Docs

Full API reference: [slingshot.github.io/audiosalad-xml](https://slingshot.github.io/audiosalad-xml/)

## License

MIT
```

- [ ] **Step 2: Create `AGENTS.md`**

```markdown
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
3. **Implicit UTC.** `date.toISOString().split('T')[0]` converts through UTC and
   can shift a local-time date by a day. Use `src/core/datetime.ts`, which is
   explicit about it.
4. **Type-only exports.** `export { SomeType }` for a type breaks every modern
   bundler. `verbatimModuleSyntax` now catches it; use `export type`.
5. **Escaping is not enough.** XML 1.0 cannot represent C0 control characters or
   lone surrogates at all, even as character references. `findIllegalChar`
   catches them before they reach output.

## Tests

Four layers, all under `test/`:

- **unit** (`test/core/`, `test/spec/`) — the kernel and each table
- **golden** (`test/golden.test.ts`) — fixtures serialized to committed XML and
  validated against the XSD with `xmllint-wasm`
- **property** (`test/property.test.ts`) — `build(parse(build(x))) === build(x)`
  over generated inputs, plus XSD validation of each
- **regression** (`test/regressions.test.ts`) — one named test per 0.1.x defect

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
```

- [ ] **Step 3: Symlink `CLAUDE.md` to `AGENTS.md`**

```bash
ln -s AGENTS.md CLAUDE.md
git add AGENTS.md CLAUDE.md README.md
git ls-files -s CLAUDE.md
```

Expected: mode `120000`, confirming git recorded a symlink rather than a copy.

- [ ] **Step 4: Final verification**

```bash
bun run check
bun run build
bun run size
bun run check:exports
bunx changeset status --verbose
```

Expected: all pass; changeset status reports the `1.0.0` major.

- [ ] **Step 5: Commit**

```bash
git commit -m "docs: rewrite the README and add AGENTS.md

Adds a 0.1.x migration guide and the v3.4 schema delta. CLAUDE.md is a
symlink to AGENTS.md."
```

---

## Acceptance

Confirm every item before declaring the plan complete:

- [ ] `bun install && bun run build && bun test` passes from a clean checkout
- [ ] `bun run check:exports` reports no publint or attw problems
- [ ] Every golden fixture validates against `schemas/audiosalad_release_v3.4.xsd`
- [ ] All eight defects have a named test in `test/regressions.test.ts`
- [ ] Runtime `dependencies` is `{}`
- [ ] `bunx commitlint --from <base> --to HEAD` passes over the whole branch
- [ ] `.changeset/initial-1-0.md` describes the 1.0.0 major
- [ ] `CLAUDE.md` is a symlink (git mode `120000`)
- [ ] The four repository preconditions in `AGENTS.md` are reported to the owner
