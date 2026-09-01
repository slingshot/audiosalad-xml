import type { DateLike } from '../core/datetime';
import type { Action } from '../enums/action';
import type { AttributeType } from '../enums/attr';
import type { CountryCode, CountryName } from '../enums/country';
import type { Genre, SubGenre } from '../enums/genre';
import type { ParticipantRole } from '../enums/participant-role';
import type { iTunesPriceTier } from '../enums/price-tier';
import type { ReleaseFormat } from '../enums/release-format';
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

export type { CountryCode, DateLike };
