import { useEffect, useState } from 'react';

import {
    load_areas,
    load_demography,
    load_deprivation,
    load_crime_group_correlation,
    load_crime_deprivation_correlation,
    load_lsoa_forces,
} from '../data/load_data';
import { make_group_correlator } from '../data/correlation';
import { make_coverage, type MonthCoverage } from '../data/coverage';
import type { DeprivationData } from '../data/deprivation';
import manifest from '../data/crime_manifest.json';
import type {
    CorrelationResult,
    CrimeDeprivationCorrelation,
    CrimeGroupCorrelation,
    Demography,
    LsoaArea,
    MonthCrimeData,
} from '../types';

export interface StaticData {
    /** Every LSOA on the map (code, name, bounding box) */
    areas: LsoaArea[];
    demography: Demography;
    deprivation: DeprivationData;
    crime_group_correlation: CrimeGroupCorrelation;
    crime_deprivation_correlation: CrimeDeprivationCorrelation;
    /** Which LSOAs have published crime data in a given month */
    coverage_for: (month: string) => MonthCoverage;
    correlate: (crime_data: MonthCrimeData, coverage: MonthCoverage) => CorrelationResult;
}

// Shared across mounts so React's dev double-mount doesn't download everything twice
let static_data_promise: Promise<StaticData> | undefined;

function load_static_data(): Promise<StaticData> {
    static_data_promise ??= Promise.all([
        load_areas(),
        load_demography(),
        load_deprivation(),
        load_crime_group_correlation(),
        load_crime_deprivation_correlation(),
        load_lsoa_forces(),
    ]).then(([areas, demography, deprivation, crime_group_correlation, crime_deprivation_correlation, lsoa_forces]) => ({
        areas,
        demography,
        deprivation,
        crime_group_correlation,
        crime_deprivation_correlation,
        coverage_for: make_coverage(lsoa_forces, manifest),
        correlate: make_group_correlator(areas, demography, deprivation),
    })).catch((error: unknown) => {
        // Don't cache a failure; the next mount should retry
        static_data_promise = undefined;
        throw error;
    });

    return static_data_promise;
}

/**
 * Data that never changes between months: the list of areas, census (ethnicity and deprivation),
 * coverage, precomputed correlations.
 * data is null until everything has loaded.
 */
export function useStaticData(): { data: StaticData | null; error: Error | null } {
    const [state, set_state] = useState<{ data: StaticData | null; error: Error | null }>({ data: null, error: null });

    useEffect(() => {
        let cancelled = false;

        load_static_data()
            .then(data => { if (!cancelled) set_state({ data, error: null }); })
            .catch((error: Error) => { if (!cancelled) set_state({ data: null, error }); });

        return () => { cancelled = true; };
    }, []);

    return state;
}
