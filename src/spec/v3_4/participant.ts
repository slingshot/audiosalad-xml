import type { ComplexType } from '../../core/descriptor';
import type { ParticipantInput } from '../../model';
import { PROPRIETARY_ID } from './proprietary-id';

/** `participant_type` */
export const PARTICIPANT: ComplexType<ParticipantInput> = {
    name: 'participant_type',
    fields: [
        { el: 'role', key: 'role', kind: 'string', min: 1, max: 1 },
        { el: 'role_type', key: 'roleType', kind: 'string', min: 0, max: 1 },
        { el: 'instrument', key: 'instrument', kind: 'string', min: 0, max: 1 },
        { el: 'name', key: 'name', kind: 'string', min: 1, max: 1 },
        { el: 'primary', key: 'primary', kind: 'boolean', min: 0, max: 1 },
        {
            el: 'artist_id',
            key: 'artistID',
            kind: 'complex',
            type: PROPRIETARY_ID,
            min: 0,
            max: Number.POSITIVE_INFINITY,
        },
    ],
};
