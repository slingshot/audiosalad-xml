export enum ReleaseFormat {
    Digital = 'digital',
    Single = 'single',
    EP = 'ep',
    Album = 'album',
    DoubleAlbum = 'double album',
    BoxSet = 'box set',
    LivePerformance = 'live performance',
    ClassicalAlbum = 'classical album',
    /** @deprecated Misspelled in 0.1.x. Use {@link ReleaseFormat.ClassicalAlbum}. */
    // biome-ignore lint/suspicious/noDuplicateEnumValues: deprecated 0.1.x alias, intentionally the same value.
    ClassicAlbum = 'classical album',
    Video = 'video',
    /** New in schema v3.4. */
    DJMix = 'dj mix',
}
