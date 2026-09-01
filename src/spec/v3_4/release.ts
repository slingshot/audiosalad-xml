import type { ComplexType } from '../../core/descriptor';
import type { ReleaseInput } from '../../model';
import { ASSET } from './asset';
import { ATTR } from './attr';
import {
    ACTION_VALUES,
    ADVISORY_VALUES,
    COUNTRY_CODE,
    FORMAT_VALUES,
    SCHEMA_ID,
    SCHEMA_LOCATION,
    SCHEMA_NAMESPACE,
    UPC_EAN,
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
        {
            el: 'advisory',
            key: 'advisory',
            kind: 'string',
            min: 0,
            max: 1,
            values: ADVISORY_VALUES,
        },
        { el: 'metadata_language', key: 'metadataLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'audio_language', key: 'audioLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'display_artist', key: 'displayArtist', kind: 'string', min: 1, max: 1 },
        {
            el: 'participant',
            key: 'participants',
            kind: 'complex',
            type: PARTICIPANT,
            min: 0,
            max: UNBOUNDED,
        },
        { el: 'compilation', key: 'compilation', kind: 'boolean', min: 0, max: 1 },
        {
            el: 'original_release_date',
            key: 'originalReleaseDate',
            kind: 'partialDate',
            min: 0,
            max: 1,
        },
        { el: 'release_date', key: 'releaseDate', kind: 'date', min: 0, max: 1 },
        {
            el: 'release_format',
            key: 'releaseFormat',
            kind: 'string',
            min: 0,
            max: 1,
            values: FORMAT_VALUES,
        },
        {
            el: 'recording_location',
            key: 'recordingLocation',
            kind: 'string',
            min: 0,
            max: 1,
            ...COUNTRY_CODE,
        },
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
        {
            el: 'price_tier',
            key: 'priceTiers',
            kind: 'complex',
            type: PRICE_TIER,
            min: 0,
            max: UNBOUNDED,
        },
        {
            el: 'permission',
            key: 'permissions',
            kind: 'complex',
            type: PERMISSION,
            min: 0,
            max: UNBOUNDED,
        },
        { el: 'global_release_date', key: 'globalReleaseDate', kind: 'dateTime', min: 0, max: 1 },
        {
            el: 'territory',
            key: 'territories',
            kind: 'complex',
            type: TERRITORY,
            min: 0,
            max: UNBOUNDED,
        },
        { el: 'asset', key: 'assets', kind: 'complex', type: ASSET, min: 0, max: UNBOUNDED },
        { el: 'track', key: 'tracks', kind: 'complex', type: TRACK, min: 1, max: UNBOUNDED },
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: UNBOUNDED },
    ],
};
