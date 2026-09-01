import type { ComplexType } from '../../core/descriptor';
import type { LabelInput } from '../../model';

/** `label_type` */
export const LABEL: ComplexType<LabelInput> = {
    name: 'label_type',
    fields: [
        { el: 'vendor_label_id', key: 'vendorLabelID', kind: 'string', min: 0, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'city', key: 'city', kind: 'string', min: 0, max: 1 },
        { el: 'state', key: 'state', kind: 'string', min: 0, max: 1 },
        { el: 'country', key: 'country', kind: 'string', min: 0, max: 1 },
        { el: 'url', key: 'url', kind: 'string', min: 0, max: 1 },
        { el: 'notes', key: 'notes', kind: 'string', min: 0, max: 1 },
    ],
};
