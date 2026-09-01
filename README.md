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

Every date field accepts a `Date` or a string. **A `Date` is always read in
UTC** — the same as 0.1.x, now documented.

That is a sharp edge for *calendar* dates, and no formatting rule removes it:
`new Date(2020, 4, 2)` is local midnight while `new Date('2020-05-02')` is UTC
midnight, so any single rule reads one of them off by a day.

**For calendar dates, pass a string.** It is unambiguous in every timezone:

```ts
{ releaseDate: '2020-05-02' }                      // -> 2020-05-02, always
{ originalReleaseDate: '2019' }                    // partial dates are allowed
{ releaseDate: new Date('2020-05-02T00:00:00Z') }  // -> 2020-05-02 (UTC)
{ releaseDate: new Date(2020, 4, 2) }              // -> 2020-05-01 west of UTC
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
| `parseRelease` rejects non-v3.4 documents | Intended — it validates while parsing |
| Node 20+ required | Upgrade your runtime |

Class field defaults (`Release.action`, `Track.trackNumber`, `Permission.enabled`,
`Territory.countryCode`, `PriceTier.type`/`name`, `Participant.role`/`primary`)
are **preserved**, so partial constructions that worked before still work.

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
