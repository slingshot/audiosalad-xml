/**
 * Enumeration for available genres.
 */
export enum Genre {
    Alternative = 'Alternative',
    Blues = 'Blues',
    Children = 'Children',
    ChristianGospel = 'Christian & Gospel',
    Classical = 'Classical',
    Country = 'Country',
    Dance = 'Dance',
    Electronic = 'Electronic',
    Folk = 'Folk',
    HipHopRap = 'Hip Hop/Rap',
    Holiday = 'Holiday',
    IndieRock = 'Indie Rock',
    Jazz = 'Jazz',
    Latin = 'Latin',
    NewAge = 'New Age',
    Pop = 'Pop',
    RBSoul = 'R&B/Soul',
    Reggae = 'Reggae',
    Rock = 'Rock',
    SingerSongwriter = 'Singer/Songwriter',
    World = 'World',
}

/**
 * Enumeration for available subgenres; each enumeration name begins with the primary genre that
 * is modified by the respective subgenre.
 */
export enum SubGenre {
    AlternativeIndieRock = 'Indie Rock',
    DanceBreakbeat = 'Breakbeat',
    DanceElectroHouse = 'Electro House',
    DanceHouse = 'House',
    DanceTechno = 'Techno',
    ElectronicAmbient = 'Ambient',
    ElectronicElectronica = 'Electronica',
    ElectronicExperimental = 'Experimental',
    HipHopRapAlternativeRap = 'Alternative Rap',
    HolidayChristmas = 'Christmas',
    LatinRegionalMexicano = 'Regional Mexicano',
    LatinSalsa = 'Salsa',
    PopAdultContemporary = 'Adult Contemporary',
    PopKPop = 'K-Pop',
    PopPopRock = 'Pop/Rock',
    PopSoftRock = 'Soft Rock',
    RBSoulFunk = 'Funk',
    RockMetal = 'Metal',
    WorldAfroBeat = 'Afro-Beat',
}
