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
