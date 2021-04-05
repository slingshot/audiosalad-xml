import { Participant } from './Participant';
import { GenreType } from './GenreType';
import { Text } from './Text';
import { PriceTier } from './PriceTier';
import { Permission } from './Permission';
import { Territory } from './Territory';
import { Asset } from './Asset';
import { Attr } from './Attr';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Describes a single track within a release; maps to `track_type`
 */
export class Track {
    /**
     * A proprietary release identifier as used by the vendor. Appears for information purposes
     * only within AudioSalad; maps to `vendor_track_id`
     */
    vendorTrackID?: string;

    /**
     * The ISRC (International Standard Recording Code) for the recording; maps to `isrc`
     */
    isrc?: string;

    /**
     * The ISWC (International Standard Work Code) for the musical work; maps to `iswc`
     */
    iswc?: string;

    /**
     * The disc number for this track. Generally, this will be 1 unless the release has multiple
     * disks; maps to `disc_number`
     */
    discNumber?: number;

    /**
     * The track number within the disc/release; maps to `track_number`
     */
    trackNumber: number = 1;

    /**
     * Track title, minus any title version; maps to `title`
     */
    title: string = '';

    /**
     * Any title versions, e.g. Radio Edit; maps to `title_version`
     */
    titleVersion?: string;

    /**
     * The musical work, if this track is part og a longer continuous musical work. Specific to
     * classical content; maps to `work`
     */
    work?: string;

    /**
     * The track's length, in seconds; maps to `track_length`
     */
    trackLength?: number;

    /**
     * Parental advisory classification of the track, one of `none`/`clean`/`explicit`; maps to
     * `advisory`
     */
    advisory?: 'none' | 'clean' | 'explicit';

    /**
     * Language of the track's lyrics. Should be a capitalized language name (e.g. French or
     * English). If provided, overrides the release-level value; maps to `audio_language`
     */
    audioLanguage?: string;

    /**
     * The track's number of beats per minute; maps to `bpm`
     */
    bpm?: number;

    /**
     * The start time for the track preview, in seconds; maps to `preview_start`
     */
    previewStart?: number;

    /**
     * The duration for the track preview, in seconds; maps to `preview_duration`
     */
    previewDuration?: number;

    /**
     * The display artist's name, as it will appear on the track listing; maps to `display_artist`
     */
    displayArtist: string = '';

    /**
     * Array of participants (people who have been involved with a recording or release, e.g.
     * musicians, vocalists, producers, engineers, etc.). Use the `Participant` interface to
     * ensure valid data is provided; maps to `participants`
     */
    participants?: Array<Participant>;

    /**
     * An array of genres for the release. Use the `GenreType` interface to ensure valid data is
     * provided; maps to `genre`
     */
    genres?: Array<GenreType>;

    /**
     * An array of tags that can be used for custom organization, e.g. mood/theme; maps to `tag`
     */
    tags?: Array<string>;

    /**
     * Any notes (only shown in AudioSalad/internally); maps to `notes`
     */
    notes?: string;

    /**
     * An array of `Text` interfaces, which map to any specific text items for the release. For
     * releases, this will usually be used to provide lyrics. Use the `Text` interface, and see
     * its docs for more details; maps to `text`
     */
    texts?: Array<Text>;

    /**
     * The owner of the copyright for the release (often the label name), as it appears on the
     * product copyright legend; maps to `c_info`
     */
    cInfo?: string;

    /**
     * The copyright year, as it appears on the product copyright legend; maps to `c_year`
     */
    cYear?: number;

    /**
     * The owner of the phonographic copyright for the release (often the label name), as it
     * appears on the product phonographic copyright legend; maps to `p_info`
     */
    pInfo?: string;

    /**
     * The phonographic copyright year, as it appears on the product phonographic copyright
     * legend; maps to `p_year`
     */
    pYear?: number;

    /**
     * The full name of the musical rights holder, often the name of the record label; maps to
     * `rights_holders`
     */
    rightsHolders?: string;

    /**
     * An array of price tiers conveying the pricing levels for the release. Use the `PriceTier`
     * interface to ensure the input is valid; maps to `price_tier`
     */
    priceTiers?: Array<PriceTier>;

    /**
     * An array of `Permission` objects conveying when and where the release has been license
     * for specific permissions. Use the `Permission` interface; maps to `permissions`
     */
    permissions?: Array<Permission>;

    /**
     * An array of territories conveying specifics for any given territories. Use the
     * `Territory` interface for validating input; maps to `territory`
     */
    territories?: Array<Territory>;

    /**
     * An array of release-related assets for images, music videos, documentation, etc. Use the
     * `Asset` interface to ensure valid input; maps to `asset`
     */
    assets?: Array<Asset>;

    /**
     * Any custom attributes for the track. Provide any JS object and this library will
     * automatically map this to AudioSalad's `attr_type`, including inferring typing from your
     * provided variables.
     */
    attr?: Array<Attr>;

    /**
     * Constructor for `Track` objects. Takes all of the attributes as an object.
     * @param track - An object containing all fields for the Track.
     */
    constructor(track: Partial<Track>) {
        Object.assign(this, track);
    }

    /**
     * Generates AudioSalad XML for the track.
     * @returns AudioSalad XML `<track>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <track>
                ${this.vendorTrackID ? `<vendor_track_id>${this.vendorTrackID}</vendor_track_id>` : ''}
                ${this.isrc ? `<isrc>${this.isrc}</isrc>` : ''}
                ${this.iswc ? `<iswc>${this.iswc}</iswc>` : ''}
                ${this.discNumber ? `<disc_number>${this.discNumber}</disc_number>` : ''}
                ${this.trackNumber ? `<track_number>${this.trackNumber}</track_number>` : ''}
                <title>${this.title}</title>
                ${this.titleVersion ? `<title_version>${this.titleVersion}</title_version>` : ''}                
                ${this.work ? `<work>${this.work}</work>` : ''}                
                ${this.trackLength ? `<track_length>${this.trackLength}</track_length>` : ''}                
                ${this.advisory ? `<advisory>${this.advisory}</advisory>` : ''}                
                ${this.audioLanguage ? `<audio_language>${this.audioLanguage}</audio_language>` : ''}                
                ${this.bpm ? `<bpm>${this.bpm}</bpm>` : ''}                
                ${this.previewStart ? `<preview_start>${this.previewStart}</preview_start>` : ''}                
                ${this.previewDuration ? `<preview_duration>${this.previewDuration}</preview_duration>` : ''}
                <display_artist>${this.displayArtist}</display_artist>                
                ${this.participants?.map((participant: Participant) => participant.xml()).join('') ?? ''}               
                ${this.genres?.map((genre: GenreType) => genre.xml()).join('') ?? ''}
                ${this.tags?.map((tag) => `<tag>${tag}</tag>`).join('') ?? ''}
                ${this.notes ? `<notes>${this.notes}</notes>` : ''}   
                ${this.texts?.map((text: Text) => text.xml()).join('') ?? ''}
                ${this.cInfo ? `<c_info>${this.cInfo}</c_info>` : ''}   
                ${this.cYear ? `<c_year>${this.cYear}</c_year>` : ''} 
                ${this.pInfo ? `<p_info>${this.pInfo}</p_info>` : ''}   
                ${this.pYear ? `<p_year>${this.pYear}</p_year>` : ''} 
                ${this.rightsHolders ? `<rights_holders>${this.rightsHolders}</rights_holders>` : ''}
                ${this.priceTiers?.map((tier: PriceTier) => tier.xml()).join('') ?? ''}
                ${this.permissions?.map((permission: Permission) => permission.xml()).join('') ?? ''}
                ${this.territories?.map((territory: Territory) => territory.xml()).join('') ?? ''}
                ${this.assets?.map((asset: Asset) => asset.xml()).join('') ?? ''}
                ${this.attr?.map((attribute: Attr) => attribute.xml()).join('') ?? ''}
            </track>
        `) as AudioSaladXML;
    }
}
