import type { ComplexType } from '../../core/descriptor';
import type { ProprietaryIdInput } from '../../model';

/** `proprietary_id_type` */
export const PROPRIETARY_ID: ComplexType<ProprietaryIdInput> = {
    name: 'proprietary_id_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 1, max: 1 },
        { el: 'id', key: 'id', kind: 'string', min: 1, max: 1 },
    ],
};
