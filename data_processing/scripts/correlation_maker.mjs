import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Shared with the front end so both sides use the same coverage rules and maths
import { make_coverage } from '../../front_end/src/data/coverage.ts';
import { GROUPS } from '../../front_end/src/data/demography_groups.ts';
import { deprivation_score } from '../../front_end/src/data/deprivation.ts';
import { rank_values, pearson_correlation } from '../../front_end/src/data/statistics.ts';

// Correlates each ethnic group's share of residents, and each area's household
// deprivation score, with each crime type, across every LSOA in England & Wales,
// pooling all months.
//
// Two measures per crime type:
//  - mix:  that crime type's share of all crime recorded in the area
//  - rate: that crime type per 1,000 residents per month
//
// An LSOA only contributes the months in which its police force published data.

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const front_end_dir = path.join(script_dir, '../../front_end');
const data_dir = path.join(front_end_dir, 'public/data');
const crime_dir = path.join(data_dir, 'crime');
const manifest_path = path.join(front_end_dir, 'src/data/crime_manifest.json');
const lsoa_forces_path = path.join(data_dir, 'lsoa_forces.json');
const output_path = path.join(data_dir, 'crime_group_correlation.json');
const deprivation_output_path = path.join(data_dir, 'crime_deprivation_correlation.json');

const read_json = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));

/**
 * Recompute crime_group_correlation.json and crime_deprivation_correlation.json
 * from every month in the manifest.
 */
export function run_correlations({ log = console.log } = {}) {

    const demography = read_json(path.join(data_dir, 'LSOA_2021_demography.json'));
    const deprivation = read_json(path.join(data_dir, 'LSOA_2021_deprivation.json')).lsoa;
    const manifest = read_json(manifest_path);
    const coverage_for = make_coverage(read_json(lsoa_forces_path), manifest);

    // Every LSOA with census residents and households; coverage decides month by month which of them count
    const all_areas = Object.keys(demography).filter(lsoa =>
        demography[lsoa].total_population > 0 && Number.isFinite(deprivation_score(deprivation[lsoa] ?? []))
    );
    const area_index = new Map(all_areas.map((lsoa, i) => [lsoa, i]));

    // Pool crime counts per area per crime type across every covered month
    let crime_lookup = [];
    const all_counts = [];
    const months_covered = new Float64Array(all_areas.length);

    for (const month of manifest.months) {
        const month_data = read_json(path.join(crime_dir, `${month}.json`));
        const { has_data } = coverage_for(month);
        const covered = all_areas.map(has_data);

        // crime_lookup only ever grows between months, so the latest one covers every id
        if (month_data.crime_lookup.length > crime_lookup.length) {
            crime_lookup = month_data.crime_lookup;
        }

        covered.forEach((is_covered, i) => { if (is_covered) months_covered[i]++; });

        for (const [lsoa, crimes] of Object.entries(month_data.lsoa)) {
            const i = area_index.get(lsoa);
            if (i === undefined || !covered[i]) {
                continue;
            }

            for (const [crime_id, count] of Object.entries(crimes)) {
                all_counts[crime_id] ??= new Float64Array(all_areas.length);
                all_counts[crime_id][i] += count;
            }
        }

        log(`${month} POOLED`);
    }

    // Keep areas with at least one covered month
    const kept = all_areas.map((_, i) => i).filter(i => months_covered[i] > 0);
    const areas = kept.map(i => all_areas[i]);
    const counts = crime_lookup.map((_, crime_id) => {
        const crime_counts = all_counts[crime_id];
        return Float64Array.from(kept, i => crime_counts?.[i] ?? 0);
    });

    const totals = new Float64Array(areas.length);
    for (const crime_counts of counts) {
        crime_counts.forEach((count, i) => totals[i] += count);
    }

    // Residents × months covered: the denominator for "per 1,000 residents per month"
    const exposure = areas.map((lsoa, i) => demography[lsoa].total_population * months_covered[kept[i]]);

    // Demography is fixed, so each group's share ranks are computed once
    const share_ranks = GROUPS.map(group =>
        rank_values(areas.map(lsoa => (demography[lsoa][group] ?? 0) / demography[lsoa].total_population))
    );

    // ...and so are the deprivation score ranks
    const deprivation_ranks = rank_values(areas.map(lsoa => deprivation_score(deprivation[lsoa])));

    const round = (rho) => Number(rho.toFixed(4));

    // Correlate one list of per-area crime values with every group and with deprivation
    const correlate = (values) => {
        const value_ranks = rank_values(values);
        return {
            groups: share_ranks.map(ranks => round(pearson_correlation(ranks, value_ranks))),
            deprivation: round(pearson_correlation(deprivation_ranks, value_ranks)),
        };
    };

    const mix = [];
    const rate = [];
    const deprivation_mix = [];
    const deprivation_rate = [];

    crime_lookup.forEach((crime_type, crime_id) => {
        const crime_counts = counts[crime_id];

        const by_mix = correlate(crime_counts.map((count, i) => totals[i] > 0 ? count / totals[i] : 0));
        const by_rate = correlate(crime_counts.map((count, i) => count / exposure[i] * 1000));

        mix.push(by_mix.groups);
        rate.push(by_rate.groups);
        deprivation_mix.push(by_mix.deprivation);
        deprivation_rate.push(by_rate.deprivation);

        log(`${crime_type} CORRELATED`);
    });

    // All crime together, per 1,000 residents per month
    const all_crime_rate = correlate(totals.map((total, i) => total / exposure[i] * 1000));

    const result = {
        first_month: manifest.months[0],
        last_month: manifest.months[manifest.months.length - 1],
        areas: areas.length,
        crime_lookup,
        groups: GROUPS,
        mix,
        rate,
    };

    const deprivation_result = {
        first_month: result.first_month,
        last_month: result.last_month,
        areas: areas.length,
        crime_lookup,
        all_crime_rate: all_crime_rate.deprivation,
        mix: deprivation_mix,
        rate: deprivation_rate,
    };

    fs.writeFileSync(output_path, JSON.stringify(result, null, 2), 'utf-8');
    fs.writeFileSync(deprivation_output_path, JSON.stringify(deprivation_result, null, 2), 'utf-8');

    log(`crime_group_correlation.json and crime_deprivation_correlation.json GENERATED (${areas.length} areas, ${manifest.months.length} months)`);

    return result;
}

// Run directly: npm run correlations
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    run_correlations();
}
