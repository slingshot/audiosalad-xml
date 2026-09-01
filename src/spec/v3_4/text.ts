import type { ComplexType } from '../../core/descriptor';
import type { TextInput } from '../../model';

/** `text_type` */
export const TEXT: ComplexType<TextInput> = {
    name: 'text_type',
    fields: [
        { el: 'type', key: 'type', kind: 'string', min: 0, max: 1 },
        { el: 'language', key: 'language', kind: 'string', min: 0, max: 1 },
        { el: 'content', key: 'content', kind: 'string', min: 1, max: 1 },
    ],
};
