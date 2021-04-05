import { ReleaseTextType, TrackTextType } from './Text.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Encapsulates a piece of textual information. Applies for both release level and track level;
 * maps to `text_type`
 */
export class Text {
    /**
     * Type of text info. Use ReleaseTextType or TrackTextType enums for validation; maps to `type`
     */
    type?: ReleaseTextType | TrackTextType | string;

    /**
     * The text's language. Should be a capitalized language name e.g. English or French; maps
     * to `language`
     */
    language?: string;

    /**
     * The plaintext, HTML, or TTML content; maps to `content`
     */
    content: string = '';

    /**
     * Constructor for `Text` objects. Takes all of the attributes as an object.
     * @param text - An object containing all fields for the Text.
     */
    constructor(text: Partial<Text>) {
        Object.assign(this, text);
    }

    /**
     * Generates AudioSalad XML for the text.
     * @returns AudioSalad XML `<text>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <text>
                ${this.type ? `<type>${this.type}</type>` : ''}
                ${this.language ? `<language>${this.language}</language>` : ''}
                <content>${this.content}</content>
            </text>
        `) as AudioSaladXML;
    }
}
