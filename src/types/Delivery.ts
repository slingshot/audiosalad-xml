import xmlEscape from 'xml-escape';
import { Action } from './Action.enum';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Defines a delivery to a set of DSPs; maps to `dsp_delivery_type`
 */
export class Delivery {
    /**
     * DSP identifiers for which to target this delivery; maps to `dsp`
     */
    dsps: Array<string> = [''];

    /**
     * Delivery action/operation. Use `Action` enum; maps to `action`
     */
    action: Action = Action.Add;

    /**
     * Scheduled delivery date; omit for ASAP. Provide a Date object; maps to `delivery_date`
     */
    deliveryDate?: Date;

    /**
     * Constructor for Deliveries. Takes all of the release attributes as an object.
     * @param delivery - An object containing all fields for the Delivery.
     */
    constructor(delivery: Partial<Delivery>) {
        Object.assign(this, delivery);
    }

    /**
     * Generates AudioSalad XML for the delivery.
     * @returns AudioSalad XML `<dsp_delivery>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <dsp_delivery>
                 ${this.dsps.map((dsp) => `<dsp>${xmlEscape(dsp)}</dsp>`)}
                 <action>${this.action}</action>
                 ${this.deliveryDate ? `<delivery_date>${xmlEscape(this.deliveryDate.toISOString())}</delivery_date>` : ''}
            </dsp_delivery>
        `) as AudioSaladXML;
    }
}
