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
        {
            el: 'advisory',
            key: 'advisory',
            kind: 'string',
            min: 0,
            max: 1,
            values: ADVISORY_VALUES,
        },
        { el: 'audio_language', key: 'audioLanguage', kind: 'string', min: 0, max: 1 },
        { el: 'bpm', key: 'bpm', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'preview_start', key: 'previewStart', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'preview_duration', key: 'previewDuration', kind: 'unsignedInt', min: 0, max: 1 },
        { el: 'display_artist', key: 'displayArtist', kind: 'string', min: 1, max: 1 },
        {
            el: 'participant',
            key: 'participants',
            kind: 'complex',
            type: PARTICIPANT,
            min: 0,
            max: UNBOUNDED,
        },
        { el: 'genre', key: 'genres', kind: 'complex', type: GENRE, min: 0, max: UNBOUNDED },
        { el: 'tag', key: 'tags', kind: 'string', min: 0, max: UNBOUNDED },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
        { el: 'text', key: 'texts', kind: 'complex', type: TEXT, min: 0, max: UNBOUNDED },
        { el: 'c_info', key: 'cInfo', kind: 'string', min: 0, max: 1 },
        { el: 'c_year', key: 'cYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'p_info', key: 'pInfo', kind: 'string', min: 0, max: 1 },
        { el: 'p_year', key: 'pYear', kind: 'gYear', min: 0, max: 1 },
        { el: 'rights_holders', key: 'rightsHolders', kind: 'string', min: 0, max: 1 },
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
        {
            el: 'territory',
            key: 'territories',
            kind: 'complex',
            type: TERRITORY,
            min: 0,
            max: UNBOUNDED,
        },
        { el: 'asset', key: 'assets', kind: 'complex', type: ASSET, min: 0, max: UNBOUNDED },
        { el: 'attr', key: 'attr', kind: 'complex', type: ATTR, min: 0, max: UNBOUNDED },
    ],
};
