import type { ComplexType } from '../../core/descriptor';
import type { PermissionInput } from '../../model';
import { ATTR } from './attr';
import { COUNTRY_CODE } from './facets';

/** `permission_type` */
export const PERMISSION: ComplexType<PermissionInput> = {
    name: 'permission_type',
    fields: [
        // maxOccurs widened from 1 to unbounded in schema v3.4.
        { el: 'type', key: 'type', kind: 'string', min: 1, max: Number.POSITIVE_INFINITY },
        { el: 'enabled', key: 'enabled', kind: 'boolean', min: 1, max: 1 },
        { el: 'start_date', key: 'startDate', kind: 'dateTime', min: 0, max: 1 },
        { el: 'end_date', key: 'endDate', kind: 'dateTime', min: 0, max: 1 },
        // New in schema v3.4.
        {
            el: 'attr',
            key: 'attr',
            kind: 'complex',
            type: ATTR,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
        {
            el: 'country_code',
            key: 'countryCode',
            kind: 'string',
            min: 0,
            max: Number.POSITIVE_INFINITY,
            ...COUNTRY_CODE,
        },
    ],
};
