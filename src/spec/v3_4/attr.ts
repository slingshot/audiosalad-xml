import type { ComplexType } from '../../core/descriptor';
import type { AttrInput } from '../../model';
import { ATTR_TYPE_VALUES } from './facets';

/** `attr_type` */
export const ATTR: ComplexType<AttrInput> = {
    name: 'attr_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 0, max: 1, values: ATTR_TYPE_VALUES },
        { el: 'key', key: 'key', kind: 'string', min: 1, max: 1 },
        { el: 'value', key: 'value', kind: 'string', min: 1, max: 1 },
    ],
};
