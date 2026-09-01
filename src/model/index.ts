import type { DateLike } from '../core/datetime';
import type { AttributeType } from '../enums/attr';
import type { CountryCode, CountryName } from '../enums/country';
import type { Genre, SubGenre } from '../enums/genre';
import type { iTunesPriceTier } from '../enums/price-tier';
import type { ReleaseTextType, TrackTextType } from '../enums/text';

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

export type { CountryCode, DateLike };
