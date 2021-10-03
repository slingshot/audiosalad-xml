import xmlEscape from 'xml-escape';
import { CountryCode } from './Country.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * A date and region-bounded distribution permissions; maps to `permission_type`
 */
export class Permission {
    /**
     * The permissions type. See AudioSalad documentation for possible types; maps to `type`
     */
    type: 'preorder' | 'stream' | 'download' | 'subscription' | 'track_sale' | string = '';

    /**
     * Boolean flag defining whether the permissions is granted or not; maps to `enabled`
     */
    enabled: boolean = true;

    /**
     * The start of the date range for which this permissions applies. Provide a Date object;
     * maps to `start_date`
     */
    startDate?: Date;

    /**
     * The end of the date range for which this permissions applies. Provide a Date object;
     * maps to `end_date`
     */
    endDate?: Date;

    /**
     * A 2-character ISO country code indicating the regions where this applies. Use the
     * CountryCode enum for an easy, validated option; maps to `country_code`
     */
    countryCode?: Array<CountryCode | string> = [];

    /**
     * Constructor for `Permission` objects. Takes all of the attributes as an object.
     * @param permission - An object containing all fields for the Permission.
     */
    constructor(permission: Partial<Permission>) {
        Object.assign(this, permission);
    }

    /**
     * Generates AudioSalad XML for the permissions.
     * @returns AudioSalad XML `<permissions>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <permission>
                <type>${xmlEscape(this.type)}</type>
                <enabled>${this.enabled}</enabled>
                ${this.startDate ? `<start_date>${xmlEscape(this.startDate.toISOString())}</start_date>` : ''}
                ${this.endDate ? `<end_date>${xmlEscape(this.endDate.toISOString())}</end_date>` : ''}
                ${this.countryCode ? this.countryCode.map((code) => `<country_code>${xmlEscape(code)}</country_code>`).join('') : ''}
            </permission>
        `) as AudioSaladXML;
    }
}
