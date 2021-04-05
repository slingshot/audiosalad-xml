import { Attr } from './Attr';
import { AudioSaladXML } from './AudioSaladXML';
import { formatXml } from '../formatter';

/**
 * Encapsulates a file asset, e.g. an audio recording, artwork image, etc; maps to `asset_type`
 */
export class Asset {
    /**
     * The asset type. Generally this will be either `audio`, `image`, or `asset` (for all other
     * types of assets), but any string can be provided; maps to `type`
     */
    type: 'audio' | 'image' | 'asset' | string = '';

    /**
     * The AudioSalad media type, e.g. `wav` or `Front` (or for arbitrary files, e.g.
     * `Document`); maps to `sub_type`
     */
    subtype?: string;

    /**
     * An optional descriptive name for the asset; maps to `name`
     */
    name?: string;

    /**
     * Any textual notes to accompany the asset; maps to `notes`
     */
    notes?: string;

    /**
     * The format of the file, generally the same as the file extension; maps to `format`
     */
    format?: string;

    /**
     * The file's `mime-type`, e.g. `video/wav` or `image/jpg`. We recommend using a
     * `mime-types` library (like [mime-types](https://www.npmjs.com/package/mime-types) and/or
     * [@types/mime-types](https://www.npmjs.com/package/@types/mime-types)) to ensure that the
     * input provided here is actually valid; maps to `mime_type`
     */
    mimeType?: string;

    /**
     * A 128-bit MD5 hash for the file, to ensure its contents; maps to `md5_checksum`
     */
    md5Checksum: string = '';

    /**
     * The real filename with extension (if applicable) and without disk folder structure; maps
     * to `file_name`
     */
    fileName: string = '';

    /**
     * Any custom attributes for the asset. Use the `Attr` class.
     */
    attr?: Array<Attr>;

    /**
     * Constructor for `Asset` objects. Takes all of the attributes as an object.
     * @param asset - An object containing all fields for the Asset.
     */
    constructor(asset: Partial<Asset>) {
        Object.assign(this, asset);
    }

    /**
     * Generates AudioSalad XML for the asset.
     * @returns AudioSalad XML `<asset>` element
     */
    xml(): AudioSaladXML {
        return formatXml(`
            <asset>
                <type>${this.type}</type>
                ${this.subtype ? `<sub_type>${this.subtype}</sub_type>` : ''}
                ${this.name ? `<name>${this.name}</name>` : ''}
                ${this.notes ? `<notes>${this.notes}</notes>` : ''}
                ${this.format ? `<format>${this.format}</format>` : ''}
                ${this.mimeType ? `<mime_type>${this.mimeType}</mime_type>` : ''}
                <md5_checksum>${this.md5Checksum}</md5_checksum>
                <file_name>${this.fileName}</file_name>
                ${this.attr?.forEach((attr: Attr) => attr.xml()) ?? ''}
            </asset>
        `) as AudioSaladXML;
    }
}
