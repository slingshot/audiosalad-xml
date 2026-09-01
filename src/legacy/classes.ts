import { buildNode, type ComplexType } from '../core/descriptor';
import { AudioSaladValidationError, type Issue } from '../core/issues';
import { serialize } from '../core/serialize';
import { Action } from '../enums/action';
import { CountryCode } from '../enums/country';
import { ParticipantRole } from '../enums/participant-role';
import type {
    AssetInput,
    AttrInput,
    GenreInput,
    LabelInput,
    ParticipantInput,
    PermissionInput,
    PriceTierInput,
    ProprietaryIdInput,
    ReleaseInput,
    TerritoryInput,
    TextInput,
    TrackInput,
} from '../model';
import {
    ASSET,
    ATTR,
    GENRE,
    LABEL,
    PARTICIPANT,
    PERMISSION,
    PRICE_TIER,
    PROPRIETARY_ID,
    RELEASE,
    ROOT_ATTRS,
    TERRITORY,
    TEXT,
    TRACK,
} from '../spec/v3_4';
import { SAMPLE_RELEASE } from './sample';

/** Alias for a string, implying AudioSalad-compatible XML. */
export type AudioSaladXML = string;

/** What every facade class adds on top of its input fields. */
export interface FacadeMethods {
    /** Collects validation issues without throwing. */
    validate(): Issue[];
    /**
     * Generates AudioSalad XML.
     *
     * @throws {AudioSaladValidationError} when the object is invalid.
     */
    xml(): AudioSaladXML;
}

/** Instances expose the input fields as public properties, as 0.1.x did. */
export type FacadeClass<I> = new (input: Partial<I>) => I & FacadeMethods;

interface FacadeOptions<I> {
    /** Field defaults, preserving the 0.1.x class initializers. */
    defaults?: Partial<I>;
    /** Root elements carry namespace attributes and an XML declaration. */
    root?: boolean;
}

const facade = <I extends object>(
    type: ComplexType<I>,
    elName: string,
    { defaults, root = false }: FacadeOptions<I> = {},
): FacadeClass<I> =>
    class Facade {
        constructor(input: Partial<I>) {
            Object.assign(this, defaults, input);
        }

        validate(): Issue[] {
            const issues: Issue[] = [];
            buildNode(type, this as unknown as I, elName, {
                path: '',
                issues,
                onIllegalChars: 'error',
            });
            return issues;
        }

        xml(): AudioSaladXML {
            const issues: Issue[] = [];
            const node = buildNode(type, this as unknown as I, elName, {
                path: '',
                issues,
                onIllegalChars: 'error',
            });
            if (issues.length > 0) throw new AudioSaladValidationError(issues);
            return serialize(root ? { ...node, attrs: ROOT_ATTRS } : node, {
                xmlDeclaration: root,
            });
        }
        // The cast is what gives callers `I & FacadeMethods` instead of `Facade`.
    } as unknown as FacadeClass<I>;

/** `attr_type` — a generic key/value pair. */
export const Attr = facade<AttrInput>(ATTR, 'attr');
export type Attr = AttrInput & FacadeMethods;

/** A proprietary participant ID, e.g. a Spotify or Apple artist ID. */
export const ProprietaryID = facade<ProprietaryIdInput>(PROPRIETARY_ID, 'artist_id');
export type ProprietaryID = ProprietaryIdInput & FacadeMethods;

/** `genre_type` — a genre at up to two levels of detail. */
export const GenreType = facade<GenreInput>(GENRE, 'genre');
export type GenreType = GenreInput & FacadeMethods;

/** `price_tier_type` — a pricing tier for a download platform. */
export const PriceTier = facade<PriceTierInput>(PRICE_TIER, 'price_tier', {
    defaults: { type: 'iTunes', name: 'Mid' },
});
export type PriceTier = PriceTierInput & FacadeMethods;

/** `text_type` — descriptions, reviews, liner notes, or lyrics. */
export const Text = facade<TextInput>(TEXT, 'text');
export type Text = TextInput & FacadeMethods;

/** `label_type` — the record label behind a release. */
export const Label = facade<LabelInput>(LABEL, 'label');
export type Label = LabelInput & FacadeMethods;

/** `participant_type` — anyone involved in a recording or release. */
export const Participant = facade<ParticipantInput>(PARTICIPANT, 'participant', {
    defaults: { role: ParticipantRole.Other, primary: false },
});
export type Participant = ParticipantInput & FacadeMethods;

/** `asset_type` — an audio recording, artwork image, or arbitrary file. */
export const Asset = facade<AssetInput>(ASSET, 'asset');
export type Asset = AssetInput & FacadeMethods;

/** `permission_type` — a date- and region-bounded distribution permission. */
export const Permission = facade<PermissionInput>(PERMISSION, 'permission', {
    defaults: { enabled: true },
});
export type Permission = PermissionInput & FacadeMethods;

/** `territory_type` — a release's or track's presence in a place. */
export const Territory = facade<TerritoryInput>(TERRITORY, 'territory', {
    defaults: { countryCode: [CountryCode.Worldwide] },
});
export type Territory = TerritoryInput & FacadeMethods;

/** `track_type` — a single audio track within a release. */
export const Track = facade<TrackInput>(TRACK, 'track', { defaults: { trackNumber: 1 } });
export type Track = TrackInput & FacadeMethods;

const ReleaseBase = facade<ReleaseInput>(RELEASE, 'release', {
    defaults: { action: Action.Add },
    root: true,
});

/** The `release` root element. */
export class Release extends ReleaseBase {
    /** A fully populated example, useful for testing an integration. */
    static sample(): Release {
        return new Release(SAMPLE_RELEASE);
    }
}
