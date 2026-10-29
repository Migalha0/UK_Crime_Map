import { get_lsoa_crimes, sum_crimes } from './crime_stats';
import { GROUPS, type Group } from './demography_groups';
import { deprivation_score, type DeprivationData } from './deprivation';
import { rank_values, pearson_correlation, partial_correlation } from './statistics';
import type { MonthCoverage } from './coverage';
import type { CorrelationResult, DeprivationDecile, Demography, LsoaArea, MonthCrimeData } from '../types';

// Neighbourhoods are split into this many equal-sized groups by deprivation
const DECILES = 10;

interface RankedAreas {
    areas: LsoaArea[];
    share_ranks: Record<Group, Float64Array>;
    deprivation_ranks: Float64Array;
    /** Spearman ρ between each group's share and deprivation: fixed for a given set of areas */
    share_vs_deprivation: Record<Group, number>;
    /** Decile (0 = least deprived … 9 = most deprived) of each area, same order as areas */
    decile_of_area: Uint8Array;
    /** Lowest and highest deprivation score in each decile */
    decile_ranges: [number, number][];
}

/**
 * Build a function that, for a month's crime data, measures across every LSOA with data that month:
 *  - the Spearman rank correlation between each group's share of residents and crimes per 1,000 residents;
 *  - the same correlation once household deprivation is taken out (partial Spearman correlation);
 *  - the Spearman correlation between deprivation and crimes per 1,000 residents;
 *  - crimes per 1,000 residents in each tenth of neighbourhoods, from least to most deprived.
 *
 * Census figures never change, but which LSOAs count depends on which police
 * forces published that month. Everything that only depends on the census is
 * therefore computed once per distinct set of areas (coverage key) and reused
 * by every month that shares it; each month only re-ranks its crime rates.
 */
export function make_group_correlator(
    all_areas: LsoaArea[],
    demography: Demography,
    deprivation: DeprivationData
): (crime_data: MonthCrimeData, coverage: MonthCoverage) => CorrelationResult {

    const ranked_by_coverage = new Map<string, RankedAreas>();
    const score_of = (area: LsoaArea) => deprivation_score(deprivation.lsoa[area.lsoa] ?? [0, 0, 0, 0, 0]);

    function ranked_areas(coverage: MonthCoverage): RankedAreas {
        const cached = ranked_by_coverage.get(coverage.key);
        if (cached) {
            return cached;
        }

        // Only areas with published crime data, census residents and households can take part
        const areas = all_areas.filter(area =>
            coverage.has_data(area.lsoa)
            && (demography[area.lsoa]?.total_population ?? 0) > 0
            && Number.isFinite(score_of(area))
        );

        const scores = areas.map(score_of);
        const deprivation_ranks = rank_values(scores);

        const share_ranks = {} as Record<Group, Float64Array>;
        const share_vs_deprivation = {} as Record<Group, number>;
        for (const group of GROUPS) {
            const shares = areas.map(area => {
                const people = demography[area.lsoa];
                return (people[group] ?? 0) / people.total_population;
            });
            share_ranks[group] = rank_values(shares);
            share_vs_deprivation[group] = pearson_correlation(share_ranks[group], deprivation_ranks);
        }

        // Rank 1 … n, cut into ten equal slices. Tied areas share an average rank, so they land in the same decile.
        const decile_of_area = Uint8Array.from(deprivation_ranks, rank =>
            Math.min(DECILES - 1, Math.floor((rank - 1) / areas.length * DECILES))
        );
        const decile_ranges = Array.from({ length: DECILES }, (): [number, number] => [Infinity, -Infinity]);
        scores.forEach((score, i) => {
            const range = decile_ranges[decile_of_area[i]];
            range[0] = Math.min(range[0], score);
            range[1] = Math.max(range[1], score);
        });

        const ranked = { areas, share_ranks, deprivation_ranks, share_vs_deprivation, decile_of_area, decile_ranges };
        ranked_by_coverage.set(coverage.key, ranked);
        return ranked;
    }

    return function correlate(crime_data, coverage) {
        const { areas, share_ranks, deprivation_ranks, share_vs_deprivation, decile_of_area, decile_ranges } = ranked_areas(coverage);

        const decile_crimes = new Float64Array(DECILES);
        const decile_residents = new Float64Array(DECILES);

        const rates = areas.map((area, i) => {
            const crimes = sum_crimes(get_lsoa_crimes(crime_data, area.lsoa));
            const residents = demography[area.lsoa].total_population;

            decile_crimes[decile_of_area[i]] += crimes;
            decile_residents[decile_of_area[i]] += residents;

            return crimes / residents * 1000;
        });
        const rate_ranks = rank_values(rates);

        const crime_vs_deprivation = pearson_correlation(deprivation_ranks, rate_ranks);

        const deciles: DeprivationDecile[] = decile_ranges.map(([min_score, max_score], decile) => ({
            decile: decile + 1,
            rate: decile_crimes[decile] / decile_residents[decile] * 1000,
            min_score,
            max_score,
        }));

        return {
            areas: areas.length,
            groups: GROUPS.map(group => {
                const rho = pearson_correlation(share_ranks[group], rate_ranks);
                return {
                    group,
                    rho,
                    adjusted_rho: partial_correlation(rho, share_vs_deprivation[group], crime_vs_deprivation),
                    rho_with_deprivation: share_vs_deprivation[group],
                };
            }),
            deprivation: { rho: crime_vs_deprivation, deciles },
        };
    };
}
