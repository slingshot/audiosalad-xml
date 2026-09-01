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
export const ACTION_VALUES = ['add', 'update', 'full-update', 'meta-update', 'delete'] as const;

/** advisory_type — the XSD enumerates both capitalizations. */
export const ADVISORY_VALUES = ['None', 'none', 'Clean', 'clean', 'Explicit', 'explicit'] as const;

/** format_type — `DJ Mix`/`dj mix` are new in v3.4. */
export const FORMAT_VALUES = [
    'Digital',
    'digital',
    'Single',
    'single',
    'EP',
    'ep',
    'Album',
    'album',
    'Double Album',
    'double album',
    'Box Set',
    'box set',
    'Live Performance',
    'live performance',
    'Classical Album',
    'classical album',
    'Video',
    'video',
    'DJ Mix',
    'dj mix',
] as const;

/** attr_type_type */
export const ATTR_TYPE_VALUES = ['integer', 'float', 'boolean', 'date', 'string', 'data'] as const;
