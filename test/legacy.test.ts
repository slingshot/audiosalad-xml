import { describe, expect, test } from 'bun:test';
import { buildRelease } from '../src/api';
import { Action, CountryCode, ParticipantRole } from '../src/enums';
import {
    Asset,
    Attr,
    GenreType,
    Label,
    Participant,
    Permission,
    PriceTier,
    ProprietaryID,
    Release,
    Territory,
    Text,
    Track,
} from '../src/legacy/classes';
import type { ReleaseInput, TrackInput } from '../src/model';

const minimalRelease: Omit<ReleaseInput, 'tracks'> = {
    action: 'add',
    title: 'T',
    displayArtist: 'A',
};

describe('Release facade', () => {
    test('constructs from a partial and emits XML', () => {
        const xml = new Release({
            action: 'add',
            title: 'T',
            displayArtist: 'A',
            tracks: [new Track({ trackNumber: 1, title: 'T', displayArtist: 'A' })],
        }).xml();
        expect(xml).toContain('<schema_id>audiosalad_release_v3.4</schema_id>');
    });

    test('validate() reports issues instead of throwing', () => {
        const r = new Release({ title: '', displayArtist: '', tracks: [] } as never);
        expect(r.validate().length).toBeGreaterThan(0);
    });

    test('sample() is valid', () => {
        expect(Release.sample().validate()).toEqual([]);
        expect(Release.sample().xml()).toContain('<display_artist>Billie Eilish</display_artist>');
    });

    test('sample() exercises artist_id, asset attr, and territory permission', () => {
        const xml = Release.sample().xml();
        expect(xml).toContain('<artist_id>');
        expect(xml).toContain('<file_name>');
        expect(xml).toContain('<territory>');
    });
});

describe('child facades', () => {
    test('each emits its own fragment', () => {
        expect(new Attr({ key: 'k', value: 'v' }).xml()).toContain('<attr>');
        expect(new Text({ content: 'c' }).xml()).toContain('<content>c</content>');
        expect(new Label({ name: 'L' }).xml()).toContain('<name>L</name>');
        expect(new GenreType({ primary: 'Pop' }).xml()).toContain('<primary>Pop</primary>');
        expect(new PriceTier({ type: 'iTunes', name: 'Mid' }).xml()).toContain('<price_tier>');
        expect(new Asset({ type: 'audio', fileName: 'a.wav' }).xml()).toContain('<asset>');
        expect(new Permission({ type: ['stream'], enabled: true }).xml()).toContain('<permission>');
        expect(new Territory({ countryCode: ['WW'] }).xml()).toContain(
            '<country_code>WW</country_code>',
        );
        expect(new Participant({ role: ParticipantRole.MainArtist, name: 'A' }).xml()).toContain(
            '<role>',
        );
    });

    // 0.1.x shipped ProprietaryID with no constructor, so it could not carry values.
    test('ProprietaryID takes a constructor object', () => {
        expect(new ProprietaryID({ type: 'spotify', id: 'x' }).xml()).toContain('<id>x</id>');
    });

    test('instances expose input fields without a cast', () => {
        const t = new Track({ title: 'T', displayArtist: 'A' });
        const title: string = t.title;
        expect(title).toBe('T');
    });

    test('an instance is assignable to its input type', () => {
        // The assignability itself is a type-level fact, checked by
        // `bun run typecheck` — bun strips types without checking them, so the
        // annotation below is the real assertion. Assert something the runtime
        // can actually falsify too, rather than toHaveLength on a literal.
        const tracks: TrackInput[] = [new Track({ title: 'T', displayArtist: 'A' })];
        expect(buildRelease({ ...minimalRelease, tracks })).toContain('<title>T</title>');
    });

    // 0.1.x initialized these; dropping them would break partial constructions.
    test('preserves the 0.1.x field defaults', () => {
        expect(new Track({ title: 'T', displayArtist: 'A' }).trackNumber).toBe(1);
        expect(new Participant({ name: 'A' }).primary).toBe(false);
        expect(new Participant({ name: 'A' }).role).toBe(ParticipantRole.Other);
        expect(new Permission({ type: ['stream'] }).enabled).toBe(true);
        expect(new Territory({}).countryCode).toEqual([CountryCode.Worldwide]);
        expect(new PriceTier({}).type).toBe('iTunes');
        expect(new Release({ title: 'T', displayArtist: 'A', tracks: [] }).action).toBe(Action.Add);
    });

    test('fragments carry no XML declaration', () => {
        expect(new Attr({ key: 'k', value: 'v' }).xml()).not.toContain('<?xml');
    });
});

describe('v3.4 breaking changes', () => {
    test('Delivery is gone', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        expect(mod.Delivery).toBeUndefined();
    });

    test('Permission.type is a list', () => {
        const xml = new Permission({ type: ['stream', 'download'], enabled: true }).xml();
        expect(xml.match(/<type>/g)).toHaveLength(2);
    });
});
