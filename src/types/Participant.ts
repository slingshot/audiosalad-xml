import { ParticipantRole } from './ParticipantRole.enum';
import { ProprietaryID } from './ProprietaryID';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Describes a participant who has been involved in a recording or a release. Maps to
 * `participant_type`
 */
export class Participant {
    /**
     * The participant's role in the recording or release. Provided as an enum to ensure
     * validation matches a role in AudioSalad; maps to `role`
     */
    role: ParticipantRole = ParticipantRole.Other;

    /**
     * Optional sub-role for vendor's use, e.g. Executive Producer; maps to `role_type`
     */
    roleType?: string;

    /**
     * Generally for use with the Performer role, e.g. Drums, Guitar, Programming; maps to
     * `instrument`
     */
    instrument?: string;

    /**
     * The full name of the person; maps to `name`
     */
    name: string = '';

    /**
     * True for primary participant in a given role; maps to `primary`
     */
    primary: boolean = false;

    /**
     * Third-party proprietary IDs for this participant; maps to `artist_id`
     */
    artistID?: Array<ProprietaryID>;

    /**
     * Constructor for `Participant` objects. Takes all of the attributes as an object.
     * @param participant - An object containing all fields for the Participant.
     */
    constructor(participant: Partial<Participant>) {
        Object.assign(this, participant);
    }

    /**
     * Generates AudioSalad XML for the participant.
     * @returns AudioSalad XML `<participant>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <participant>
                <role>${this.role}</role>
                ${this.roleType ? `<role_type>${this.roleType}</role_type>` : ''}
                ${this.instrument ? `<instrument>${this.instrument}</instrument>` : ''}
                <name>${this.name.trim()}</name>
                <primary>${this.primary}</primary>
                ${this.artistID?.forEach((id: ProprietaryID) => id.xml()) ?? ''}
            </participant>
        `) as AudioSaladXML;
    }
}
