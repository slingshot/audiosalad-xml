# @ssh/audiosalad-xml

## 1.0.0

### Major Changes

- [#17](https://github.com/slingshot/audiosalad-xml/pull/17) [`8185c47`](https://github.com/slingshot/audiosalad-xml/commit/8185c4708b07fcd3d2d1e72a681b9cb4449924e8) Thanks [@heysanil](https://github.com/heysanil)! - Rebuild the library around AudioSalad schema v3.4, with validation and parsing.
  
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
  - `parseRelease` validates: a v3.2 document, a wrong namespace or `schema_id`,
    duplicated singletons, out-of-order children, a non-numeric integer, or any
    value violating an XSD facet (a malformed ISRC, a non-numeric `upc_ean`, an
    unknown `action` or `release_format`, a three-letter country code) is rejected
    rather than returned.
  - Node 20 or later is required.
  
  **Fixed**
  
  - `participant/artist_id`, `asset/attr`, and `territory/permission` were built
    with `forEach` and never reached the output.
  - Numeric fields used falsy guards, so a legitimate `0` — notably
    `preview_start` — was dropped.
  - Control characters were emitted unescaped, producing unparseable documents.
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
  - The published tarball carries no install lifecycle script, and its declaration
    files no longer reference a sourcemap that is not shipped.
  
  **Unchanged, now documented**
  
  - A `Date` is read in **UTC**, exactly as 0.1.x did. For a calendar date such as
    `release_date`, pass a string (`'2020-05-02'`) — it is unambiguous in every
    timezone, whereas `new Date(2020, 4, 2)` is local midnight and
    `new Date('2020-05-02')` is UTC midnight.
  - The class field defaults (`Release.action`, `Track.trackNumber`,
    `Permission.enabled`, `Territory.countryCode`, `PriceTier.type`/`name`,
    `Participant.role`/`primary`) are preserved.
