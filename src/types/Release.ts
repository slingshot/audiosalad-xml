import { Participant } from './Participant';
import { ReleaseFormat } from './ReleaseFormat.enum';
import { CountryCode, CountryName } from './Country.enum';
import { GenreType } from './GenreType';
import { Label } from './Label';
import { PriceTier } from './PriceTier';
import { Permission } from './Permission';
import { Territory } from './Territory';
import { Asset } from './Asset';
import { Track } from './Track';
import { Action } from './Action.enum';
import { Delivery } from './Delivery';
import { Attr } from './Attr';
import { AudioSaladXML } from './AudioSaladXML';
import { Text } from './Text';
import { ParticipantRole } from './ParticipantRole.enum';
import { Genre, SubGenre } from './Genre.enum';
import { ReleaseTextType, TrackTextType } from './Text.enum';
import { iTunesPriceTier } from './PriceTier.enum';
import { AttributeType } from './Attr.enum';
import { formatXml } from '../formatter';

export class Release {
    /**
     * Usually the vendor name; maps to `distributor_name`
     * */
    distributorName?: string;

    /**
     * Any proprietary data export identifier for the data extract as used by the data provider.
     * Appears only for information purposes within AudioSalad; maps to `export_id`
     * */
    exportID?: string;

    /**
     * Export time as Date object; maps to `export_time`
     */
    exportTime?: Date;

    /**
     * AudioSalad data operation for the file; maps to `action`
     */
    action: Action = Action.Add;

    /**
     * The UPC/EAN barcode for this release; maps to `upc_ean`
     */
    upc?: number;

    /**
     * Proprietary release identifier as used by the vendor. Appears only for information
     * purposes within AudioSalad; maps to `vendor_release_id`
     */
    vendorReleaseID?: string;

    /**
     * AudioSalad release identifier; maps to `global_release_id`
     */
    globalReleaseID?: string;

    /**
     * Catalog number for this release; maps to `catalog_id`
     */
    catalogID?: string;

    /**
     * Number of this releases within a multi-part or multi-volume series; maps to `series`
     */
    series?: string;

    /**
     * Album/release title, minus any title version; maps to `title`
     */
    title: string = '';

    /**
     * Title version, e.g. Remixes; maps to `title_version`
     */
    titleVersion?: string;

    /**
     * Parental advisory status of the release; maps to `advisory`
     */
    advisory?: 'none' | 'clean' | 'explicit';

    /**
     * Language of the release and track titles, versions, etc. Should be a capitalized language
     * name, e.g. `English` or `French`; maps to `metadata_language`
     */
    metadataLanguage?: string;

    /**
     * Language of the vocals for the release; can also be overridden at the track level if
     * applicable.. Should be a capitalized language name, e.g. `English` or `French`; maps to
     * `audio_language`
     */
    audioLanguage?: string;

    /**
     * Artist's name as it appears on the release; maps to `display_artist`
     */
    displayArtist: string = '';

    /**
     * Array of participants (people who have been involved with a recording or release, e.g.
     * musicians, vocalists, producers, engineers, etc.). Use the `Participant` interface to
     * ensure valid data is provided; maps to `participant`
     */
    participants?: Array<Participant>;

    /**
     *  Flag for indicating whether the release is a compilation; maps to `compilation`
     */
    compilation?: boolean;

    /**
     * Original release date of the title. If the release isn't a re-release, this should be
     * the same as the `releaseDate` (or can be omitted for the same effect). Provide as a Date
     * object, and this library will convert it to the `partial_date` XML type that AudioSalad
     * specifies; maps to `original_release_date`
     */
    originalReleaseDate?: Date;

    /**
     * The release date, as a Date object; maps to `release_date`
     */
    releaseDate?: Date;

    /**
     * The release format. Use the `ReleaseFormat` enum to easily select a validated option, or
     * provide a string (must match capitalization options provided by AudioSalad's XSD); maps
     * to `release_format`
     */
    releaseFormat?: ReleaseFormat | string;

    /**
     * The recording country as an ISO two letter code. Use the `CountryCode` enum to easily
     * provide a valid code based on the full country name, or provide the code yourself as a
     * string; maps to `recording_location`
     */
    recordingLocation?: CountryCode | string;

    /**
     * URL of the band website, or smart URL of the release; maps to `url`
     */
    url?: string;

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
     * releases, this will usually be used to provide descriptions, reviews, and liner notes.
     * Use the `Text` interface, and see its docs for more details; maps to `text`
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
     * A `Label` interface giving details about the record label; maps to `label`
     */
    label?: Label;

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
     * The global release date with time, for a timed global release. Provide a Date object WITH
     * A SPECIFIC TIME in UTC; maps to `global_release_date`
     */
    globalReleaseDate?: Date;

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
     * An array of tracks associated with the release. Use the `Track` interface; maps to `track`
     */
    tracks: Array<Track> = [];

    /**
     * Optional DSP-specific delivery directives for the release; maps to `dsp_delivery`
     */
    dspDeliveries?: Array<Delivery>;

    /**
     * Any custom attributes for the release. Provide any JS object and this library will
     * automatically map this to AudioSalad's `attr_type`, including inferring typing from your
     * provided variables.
     */
    attr?: Array<Attr>;

    /**
     * Constructor for Releases. Takes all of the release attributes as an object.
     * @param release - An object containing all fields for the Release.
     */
    constructor(release: Partial<Release>) {
        Object.assign(this, release);
    }

    /**
     * Generates AudioSalad XML for the release.
     * @returns AudioSalad XML `<release>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <release xmlns="audiosalad_export_v3.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="audiosalad_export_v3.2 http://audiosalad-xsd.s3.amazonaws.com/audiosalad_export_v3.2.xsd">
                <schema_id>audiosalad_export_v3.2</schema_id>
                ${this.distributorName ? `<distributor_name>${this.distributorName}</distributor_name>` : ''}
                ${this.exportID ? `<export_id>${this.exportID}</export_id>` : ''}
                ${this.exportTime ? `<export_time>${this.exportTime.toISOString()}</export_time>` : ''}
                <action>${this.action}</action>
                ${this.upc ? `<upc_ean>${this.upc}</upc_ean>` : ''}
                ${this.vendorReleaseID ? `<vendor_release_id>${this.vendorReleaseID}</vendor_release_id>` : ''}
                ${this.globalReleaseID ? `<global_release_id>${this.globalReleaseID}</global_release_id>` : ''}
                ${this.catalogID ? `<catalog_id>${this.catalogID}</catalog_id>` : ''}
                ${this.series ? `<series>${this.series}</series>` : ''}
                <title>${this.title}</title>
                ${this.titleVersion ? `<title_version>${this.titleVersion}</title_version>` : ''}
                ${this.advisory ? `<advisory>${this.advisory}</advisory>` : ''}
                ${this.metadataLanguage ? `<metadata_language>${this.metadataLanguage}</metadata_language>` : ''}
                ${this.audioLanguage ? `<audio_language>${this.audioLanguage}</audio_language>` : ''}
                <display_artist>${this.displayArtist}</display_artist>
                ${this.participants?.map((participant: Participant) => participant.xml()).join('') ?? ''}               
                ${this.compilation ? `<compilation>${this.compilation}</compilation>` : ''}
                ${this.originalReleaseDate ? `<original_release_date>${this.originalReleaseDate.toISOString().split('T')[0]}</original_release_date>` : ''}
                ${this.releaseDate ? `<release_date>${this.releaseDate.toISOString().split('T')[0]}</release_date>` : ''}
                ${this.releaseFormat ? `<release_format>${this.releaseFormat}</release_format>` : ''}
                ${this.recordingLocation ? `<recording_location>${this.recordingLocation}</recording_location>` : ''}
                ${this.url ? `<url>${this.url}</url>` : ''}
                ${this.genres?.map((genre: GenreType) => genre.xml()).join('') ?? ''}
                ${this.tags?.map((tag) => `<tag>${tag}</tag>`).join('') ?? ''}
                ${this.notes ? `<notes>${this.notes}</notes>` : ''}   
                ${this.texts?.map((text: Text) => text.xml()).join('') ?? ''}
                ${this.cInfo ? `<c_info>${this.cInfo}</c_info>` : ''}   
                ${this.cYear ? `<c_year>${this.cYear}</c_year>` : ''} 
                ${this.pInfo ? `<p_info>${this.pInfo}</p_info>` : ''}   
                ${this.pYear ? `<p_year>${this.pYear}</p_year>` : ''} 
                ${this.rightsHolders ? `<rights_holders>${this.rightsHolders}</rights_holders>` : ''}
                ${this.label ? this.label.xml() : ''}
                ${this.priceTiers?.map((tier: PriceTier) => tier.xml()).join('') ?? ''}
                ${this.permissions?.map((permission: Permission) => permission.xml()).join('') ?? ''}
                ${this.globalReleaseDate ? `<global_release_date>${this.globalReleaseDate.toISOString()}</global_release_date>` : ''}
                ${this.territories?.map((territory: Territory) => territory.xml()).join('') ?? ''}
                ${this.assets?.map((asset: Asset) => asset.xml()).join('') ?? ''}
                ${this.tracks.map((track: Track) => track.xml()).join('')}
                ${this.dspDeliveries?.map((delivery: Delivery) => delivery.xml()).join('') ?? ''}
                ${this.attr?.map((attribute: Attr) => attribute.xml()).join('') ?? ''}
            </release>
        `) as AudioSaladXML;
    }

    /**
     * Generates a sample `Release` object that can be used for testing.
     */
    static sample(): Release {
        return new Release({
            distributorName: 'Slingshot Records',
            exportID: 'abc123',
            exportTime: new Date('2020-05-02'),
            action: Action.Add,
            upc: 123456789012,
            vendorReleaseID: 'xyz123',
            catalogID: 'SS-TST-01',
            series: 'Test Collection',
            title: 'Everything I Wanted',
            titleVersion: 'Slingshot Remix',
            advisory: 'explicit',
            metadataLanguage: 'English',
            audioLanguage: 'English',
            displayArtist: 'Billie Eilish',
            participants: [
                new Participant({
                    role: ParticipantRole.MainArtist,
                    name: 'Billie Eilish',
                    primary: true,
                }),
                new Participant({
                    role: ParticipantRole.SongWriter,
                    name: "Finneas O'Connell",
                    primary: false,
                }),
            ],
            compilation: false,
            originalReleaseDate: new Date('2020-05-02'),
            releaseDate: new Date('2020-05-02'),
            releaseFormat: ReleaseFormat.Single,
            recordingLocation: CountryCode.UnitedStates,
            url: 'https://billieeilish.com',
            genres: [
                new GenreType({
                    primary: Genre.Pop,
                }),
                new GenreType({
                    primary: Genre.Pop,
                    sub: SubGenre.PopAdultContemporary,
                }),
            ],
            tags: ['new', 'billie eilish', 'alternative'],
            notes: 'This is a test of the library',
            texts: [
                new Text({
                    type: ReleaseTextType.LinerNotes,
                    language: 'English',
                    content: 'Recorded at Slingshot Studios in Beverly Hills',
                }),
            ],
            cInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
            cYear: 2020,
            pInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
            pYear: 2020,
            rightsHolders: 'Billie Eilish, Slingshot Media',
            label: new Label({
                vendorLabelID: '1',
                name: 'Slingshot Records',
                city: 'Beverly Hills',
                state: 'California',
                country: CountryName.UnitedStates,
            }),
            priceTiers: [
                new PriceTier({
                    type: 'iTunes',
                    name: iTunesPriceTier.Mid,
                }),
            ],
            permissions: [
                new Permission({
                    type: 'download',
                    enabled: false,
                    startDate: new Date('2021-01-01'),
                    endDate: new Date('2021-12-31'),
                    countryCode: [CountryCode.Antarctica],
                }),
            ],
            globalReleaseDate: new Date('2020-05-02 21:00:00'),
            territories: [
                new Territory({
                    countryCode: [CountryCode.Worldwide],
                }),
            ],
            assets: [
                new Asset({
                    type: 'image',
                    name: 'Cover art',
                    format: 'jpg',
                    mimeType: 'image/jpeg',
                    md5Checksum: '03a43f76d3e52c8a4cf24fd1d8d05911',
                    fileName: 'cover-art.jpg',
                }),
                new Asset({
                    type: 'audio',
                    name: 'Everything I Wanted',
                    format: 'flac',
                    mimeType: 'audio/flac',
                    md5Checksum: '4cf2392db7ccd6c9b663f8a4da42f9cb',
                    fileName: 'everything-i-wanted.flac',
                }),
            ],
            tracks: [
                new Track({
                    vendorTrackID: 'aaa111',
                    isrc: 'QM7G92017457',
                    trackNumber: 1,
                    title: 'Everything I Wanted',
                    trackLength: 181,
                    advisory: 'explicit',
                    audioLanguage: 'English',
                    bpm: 120,
                    previewStart: 30,
                    previewDuration: 30,
                    displayArtist: 'Billie Eilish',
                    participants: [
                        new Participant({
                            role: ParticipantRole.MainArtist,
                            name: 'Billie Eilish',
                            primary: true,
                        }),
                        new Participant({
                            role: ParticipantRole.SongWriter,
                            name: "Finneas O'Connell",
                            primary: false,
                        }),
                    ],
                    texts: [
                        new Text({
                            type: TrackTextType.Lyrics,
                            language: 'English',
                            content: `As long as I'm here
                                No one can hurt you
                                Don't wanna lie here
                                But you can learn to
                                If I could change
                                The way that you see yourself
                                You wouldn't wonder why you hear
                                They don't deserve you`,
                        }),
                    ],
                    cInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
                    cYear: 2020,
                    pInfo: 'Billie Eilish, under exclusive license to Slingshot Records',
                    pYear: 2020,
                    rightsHolders: 'Billie Eilish, Slingshot Media',
                    priceTiers: [
                        new PriceTier({
                            type: 'iTunes',
                            name: iTunesPriceTier.Mid,
                        }),
                    ],
                    attr: [
                        new Attr({
                            type: AttributeType.String,
                            key: 'ss_id',
                            value: 'test1234',
                        }),
                    ],
                }),
            ],
            dspDeliveries: [
                new Delivery({
                    dsps: ['spotify'],
                    action: Action.Add,
                    deliveryDate: new Date('2021-02-12'),
                }),
            ],
            attr: [
                new Attr({
                    type: AttributeType.String,
                    key: 'ss_id',
                    value: '1234test',
                }),
            ],
        });
    }
}
