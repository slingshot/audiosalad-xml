import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Represents a proprietary participant ID, e.g. for Spotify or Apple artist IDs.
 */
export class ProprietaryID {
    /**
     * What type of identifier this is, e.g. spotify; maps to `type`
     */
    type: string = '';

    /**
     * The identifier; maps to `id`
     */
    id: string = '';

    /**
     * Generates AudioSalad XML for the ID.
     * @returns AudioSalad XML `<artist_id>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <artist_id>
                <type>${this.type}</type>
                <id>${this.id}</id>                                        
            </artist_id>
        `) as AudioSaladXML;
    }
}
