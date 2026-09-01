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
        {
            el: 'attr',
            key: 'attr',
            kind: 'complex',
            type: ATTR,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
    ],
};
