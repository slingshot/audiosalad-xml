---
'@ssh/audiosalad-xml': patch
---

Accept unzoned `xs:dateTime` values, which AudioSalad's own exports use.

`parseRelease` and `validateRelease` rejected `<start_date>2019-07-19T00:00:00</start_date>`
because the formatter required a `Z` or `±HH:MM` suffix. The timezone is
**optional** in `xs:dateTime`, and AudioSalad's published sample export omits it
on `permission/start_date` and `territory/release_date` — so the library refused
documents that validate cleanly against the v3.4 schema.

`xs:date` now likewise accepts an optional timezone suffix (`2019-08-01Z`).

Unzoned values pass through unchanged, so a round trip does not invent a
timezone the source never stated. Building from a `Date` still emits UTC with a
`Z`, unchanged. All the real checks are intact: impossible calendar dates,
out-of-range times, and bad offsets are still rejected.
