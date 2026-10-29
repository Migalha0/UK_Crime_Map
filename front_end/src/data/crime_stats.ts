import type { CrimeCounts, MonthCrimeData } from '../types';

/**
 * Crimes recorded for one LSOA, keyed by crime id.
 */
export function get_lsoa_crimes(crime_data: MonthCrimeData, lsoa: string | undefined): CrimeCounts {
    return (lsoa !== undefined && crime_data.lsoa[lsoa]) || {};
}

/**
 * Sum the counts of a { crime_id: count } object.
 */
export function sum_crimes(crimes: CrimeCounts): number {
    let total = 0;

    for (const count of Object.values(crimes)) {
        total += count;
    }

    return total;
}

/**
 * Calculate the total number of crimes in a month's dataset.
 */
export function get_country_crime(crime_data: MonthCrimeData): number {
    let total = 0;

    for (const lsoa_crimes of Object.values(crime_data.lsoa)) {
        total += sum_crimes(lsoa_crimes);
    }

    return total;
}

/**
 * Find the most frequent crime type in an LSOA.
 */
export function get_top_crime(crimes: CrimeCounts, crime_lookup: string[]): { name: string; count: number } {
    const topCrime = {
        'name': '',
        'count': 0
    };

    for (const [crime_id, count] of Object.entries(crimes)) {
        if (count > topCrime.count) {
            topCrime.name = crime_lookup[Number(crime_id)];
            topCrime.count = count;
        }
    }

    return topCrime;
}
