import xmlEscape from 'xml-escape';
import { Genre, SubGenre } from './Genre.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * The genre of a release/recording, including up to two levels of detail; maps to `genre_type`
 */
export class GenreType {
    /**
     * Primary genre. Use the Genre enum for validation; maps to `primary`
     */
    primary: Genre | string = '';

    /**
     * Subgenre. Use the SubGenre enum for validation; maps to `sub`
     */
    sub?: SubGenre | string;

    /**
     * Constructor for `GenreType` objects. Takes all of the attributes as an object.
     * @param genre - An object containing all fields for the GenreType.
     */
    constructor(genre: Partial<GenreType>) {
        Object.assign(this, genre);
    }

    /**
     * Generates AudioSalad XML for the genre.
     * @returns AudioSalad XML `<genre>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <genre>
                <primary>${xmlEscape(this.primary)}</primary>
                ${this.sub ? `<sub>${xmlEscape(this.sub)}</sub>` : ''}
            </genre>
        `) as AudioSaladXML;
    }
}
