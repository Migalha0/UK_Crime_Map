// Published research on how far offenders travel from home to commit a crime,
// shown in the "How far do offenders travel?" panel. Every figure is copied from
// the source named next to it; distances are straight-line ("as the crow flies").

export interface Source {
    label: string;
    citation: string;
    url: string;
}

export const SOURCES = {
    sorensen: {
        label: 'Denmark, residential burglary',
        citation:
            'Sorensen, D. W. M. (2005). The Journey to Danish Residential Burglary: Distributions and Correlates ' +
            "of Crime Trips Made by Convicted Danish Offenders. University of Copenhagen, for Denmark's Ministry of Justice. " +
            'Table 3.1: 3,238 trips by convicted offenders, 2002–2003.',
        url: 'https://www.justitsministeriet.dk/sites/default/files/media/Arbejdsomraader/Forskning/Forskningspuljen/2011/2005/Journey_to_Danish_Burglary__full_report_.pdf',
    },
    lentz: {
        label: 'United States suburb, all offences',
        citation:
            'Lentz, T. S., Headley Konkel, R., Gallagher, H. & Ratkowski, D. (2022). A multilevel examination of the ' +
            'association between COVID-19 restrictions and residence-to-crime distance. Crime Science, 11, 12. ' +
            'Table 2: 2,926 offences, 2018–2020 (medians converted from miles).',
        url: 'https://doi.org/10.1186/s40163-022-00172-1',
    },
    west_midlands: {
        label: 'West Midlands Police',
        citation:
            'Brumwell, A. (West Midlands Police), analysis of 258,074 crime trips over two years, reported in ' +
            'Clarke, R. V. & Eck, J. E., Crime Analysis for Problem Solvers in 60 Small Steps, Step 16: ' +
            'Study the journey to crime. ASU Center for Problem-Oriented Policing.',
        url: 'https://popcenter.asu.edu/content/step-16-study-journey-crime',
    },
    townsley: {
        label: 'Townsley & Sidebottom (2010)',
        citation:
            'Townsley, M. & Sidebottom, A. (2010). All offenders are equal, but some are more equal than others: ' +
            'variation in journeys to crime between offenders. Criminology, 48(3), 897–917.',
        url: 'https://doi.org/10.1111/j.1745-9125.2010.00205.x',
    },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export interface TripDistance {
    label: string;
    source: SourceId;
    /** Median distance, km: half of trips were shorter */
    median_km: number;
    /** Middle half of trips (25th to 75th percentile), km, when the source gives it */
    middle_half_km?: [number, number];
}

const MILE_KM = 1.609344;

export const TRIP_DISTANCES: TripDistance[] = [
    { label: 'Cellars & lofts', source: 'sorensen', median_km: 1.0, middle_half_km: [0.1, 2.8] },
    { label: 'Apartments', source: 'sorensen', median_km: 1.3, middle_half_km: [0.3, 4.9] },
    { label: 'Houses', source: 'sorensen', median_km: 3.5, middle_half_km: [1.1, 11.3] },
    { label: 'All burglaries', source: 'sorensen', median_km: 4.7, middle_half_km: [1.3, 13.5] },
    { label: 'Garages & sheds', source: 'sorensen', median_km: 5.8, middle_half_km: [1.5, 11.8] },
    { label: 'Farms', source: 'sorensen', median_km: 10.6, middle_half_km: [5.2, 20.8] },
    { label: 'Holiday homes', source: 'sorensen', median_km: 13.3, middle_half_km: [6.4, 23.4] },
    { label: 'Violent offences', source: 'lentz', median_km: 3.64 * MILE_KM },
    { label: 'Disorder offences', source: 'lentz', median_km: 3.75 * MILE_KM },
    { label: 'Property offences', source: 'lentz', median_km: 5.13 * MILE_KM },
];

/**
 * Half of the neighbourhoods on this map are narrower than this (km).
 * Width = square root of the area; median area 0.46 km², measured from
 * the ONS LSOA 2021 boundaries (all 35,672 areas add up to 150,720 km², England & Wales).
 */
export const MEDIAN_LSOA_WIDTH_KM = 0.68;

/** "About half the journeys were less than a mile" (West Midlands Police) */
export const WEST_MIDLANDS_HALF_UNDER_KM = MILE_KM;
