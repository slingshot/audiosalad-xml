import xmlEscape from 'xml-escape';
import { AttributeType } from './Attr.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Encapsulates a generic key/value pair attribute; maps to attr_type
 */
export class Attr {
    /**
     * The attribute type. Use the AttributeType enum, maps to `type`
     */
    type?: AttributeType;

    /**
     * The attribute key as a string, maps to `key`
     */
    key: string = '';

    /**
     * The attribute value as a string (even if the attribute itself is actually not of type
     * string; please cast it as a string so it can be encoded into the XML); maps to `value`
     */
    value: string = '';

    /**
     * Constructor for `Attr` objects. Takes all of the Attr attributes as an object.
     * @param attr - An object containing all fields for the `Attr`.
     */
    constructor(attr: Partial<Attr>) {
        Object.assign(this, attr);
    }

    /**
     * Generates AudioSalad XML for the attribute.
     * @returns AudioSalad XML `<attr>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <attr>
                ${this.type ? `<type>${xmlEscape(this.type)}</type>` : ''}
                <key>${xmlEscape(this.key)}</key>
                <value>${xmlEscape(this.value)}</value>
            </attr>
        `) as AudioSaladXML;
    }
}
