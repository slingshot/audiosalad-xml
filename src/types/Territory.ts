import { CountryCode } from './Country.enum';
import { Permission } from './Permission';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Encapsulates a release's or track's presence within a given country; maps to `territory_type`
 */
export class Territory {
    /**
     * Country code as a 2-character ISO, or WW for worldwide. Use the CountryCode enum for easy
     * validation of input.
     */
    countryCode: Array<CountryCode> = [CountryCode.Worldwide];

    /**
     * The release date in this territory as a Date object; maps to `release_date`
     */
    releaseDate?: Date;

    /**
     * An array of permissions to override any broader permissions at the territory level; maps
     * to `permissions`
     *
     * *NOTE: this attribute is currently unsupported in AudioSalad.*
     */
    permissions?: Array<Permission>;

    /**
     * Constructor for `Territory` objects. Takes all of the attributes as an object.
     * @param territory - An object containing all fields for the Territory.
     */
    constructor(territory: Partial<Territory>) {
        Object.assign(this, territory);
    }

    /**
     * Generates AudioSalad XML for the territory.
     * @returns AudioSalad XML `<territory>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <territory>
                 <country_code>${this.countryCode}</country_code>
                 ${this.releaseDate ? `<release_date>${this.releaseDate}</release_date>` : ''}
                 ${this.permissions?.forEach((permission: Permission) => permission.xml()) ?? ''}
            </territory>
        `) as AudioSaladXML;
    }
}
