import type { ComplexType } from '../../core/descriptor';
import type { GenreInput } from '../../model';

/** `genre_type` */
export const GENRE: ComplexType<GenreInput> = {
    name: 'genre_type',
    fields: [
        { el: 'primary', key: 'primary', kind: 'string', min: 1, max: 1 },
        { el: 'sub', key: 'sub', kind: 'string', min: 0, max: 1 },
    ],
};
