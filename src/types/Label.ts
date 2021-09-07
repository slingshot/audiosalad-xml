import xmlEscape from 'xml-escape';
import { CountryName } from './Country.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Describes the record label that has produced a given release, the name being the only
 * mandatory element; maps to `label_type`
 */
export class Label {
    /**
     * AudioSalad ID for the label; maps to `vendor_label_id`
     */
    vendorLabelID?: string;

    /**
     * Full name of the record label; maps to `name`
     */
    name: string = '';

    /**
     * City of the label; maps to `city`
     */
    city?: string;

    /**
     * State of the label; maps to `state`
     */
    state?: string;

    /**
     * Country of the label as a capitalized country name. Use the CountryName enum for
     * validation and convenience; maps to `country`
     */
    country?: CountryName | string;

    /**
     * Constructor for `Label` objects. Takes all of the attributes as an object.
     * @param label - An object containing all fields for the Label.
     */
    constructor(label: Partial<Label>) {
        Object.assign(this, label);
    }

    /**
     * Generates AudioSalad XML for the label.
     * @returns AudioSalad XML `<label>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <label>
                ${this.vendorLabelID ? `<vendor_label_id>${xmlEscape(this.vendorLabelID)}</vendor_label_id>` : ''}
                <name>${xmlEscape(this.name)}</name>
                ${this.city ? `<city>${xmlEscape(this.city)}</city>` : ''}
                ${this.state ? `<state>${xmlEscape(this.state)}</state>` : ''}
                ${this.country ? `<country>${xmlEscape(this.country)}</country>` : ''}                        
            </label>
        `) as AudioSaladXML;
    }
}
