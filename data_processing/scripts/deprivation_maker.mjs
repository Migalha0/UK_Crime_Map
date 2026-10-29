import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csv from 'csv-parser';

// Turns the ONS Census 2021 "Household deprivation" table (TS011) for every LSOA
// into a compact JSON file the app and correlation_maker can read directly.
//
// Input: data_raw/LSOA_2021_deprivation_index.csv, six rows per LSOA:
//   LSOA code, LSOA name, category code, category name, households
// Category codes: -8 "Does not apply" (always 0), 1 "not deprived in any dimension",
// 2-5 "deprived in one / two / three / four dimensions". The four dimensions are
// employment, education, health & disability, and housing.
//
// Output: front_end/public/data/LSOA_2021_deprivation.json
//   { "dimensions": [...], "categories": [...], "lsoa": { "E01000001": [548, 253, 34, 3, 0], ... } }
// where each array holds the households deprived in 0, 1, 2, 3 and 4 dimensions.
//
// Run: npm run deprivation

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const input_csv = path.join(script_dir, '../data_raw/LSOA_2021_deprivation_index.csv');
const lsoa_index_path = path.join(script_dir, '../../front_end/public/data/lsoa_index.json');
const output_path = path.join(script_dir, '../../front_end/public/data/LSOA_2021_deprivation.json');

// ONS category code → number of dimensions the household is deprived in
const code_to_dimensions = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 };

const households_by_lsoa = {};
let skipped_households = 0;

await new Promise((resolve, reject) => {
    fs.createReadStream(input_csv)
        .pipe(csv({ headers: ['lsoa', 'lsoa_name', 'code', 'category', 'households'], skipLines: 1 }))
        .on('data', (row) => {
            const households = Number(row.households);
            const dimensions = code_to_dimensions[row.code];

            if (!Number.isFinite(households)) {
                reject(new Error(`Bad household count for ${row.lsoa}: ${row.households}`));
                return;
            }

            // "Does not apply": should always be 0, but count it so a change in the source shows up
            if (dimensions === undefined) {
                skipped_households += households;
                return;
            }

            households_by_lsoa[row.lsoa] ??= [0, 0, 0, 0, 0];
            households_by_lsoa[row.lsoa][dimensions] += households;
        })
        .on('end', resolve)
        .on('error', reject);
});

// Check the result against the map before writing anything
const map_lsoas = new Set(JSON.parse(fs.readFileSync(lsoa_index_path, 'utf-8')).lsoa);

const missing = [...map_lsoas].filter(lsoa => !households_by_lsoa[lsoa]);
const extra = Object.keys(households_by_lsoa).filter(lsoa => !map_lsoas.has(lsoa));
const empty = Object.entries(households_by_lsoa).filter(([, counts]) => counts.every(count => count === 0));

if (missing.length > 0) {
    throw new Error(`${missing.length} map LSOAs have no deprivation data, e.g. ${missing.slice(0, 5).join(', ')}`);
}

// Sort by code so the output is stable between runs
const lsoa = Object.fromEntries(
    Object.keys(households_by_lsoa).filter(code => map_lsoas.has(code)).sort().map(code => [code, households_by_lsoa[code]])
);

const output = {
    source: 'ONS Census 2021, TS011 Household deprivation, LSOA 2021',
    dimensions: ['employment', 'education', 'health and disability', 'housing'],
    categories: ['not deprived', 'deprived in 1 dimension', 'deprived in 2 dimensions', 'deprived in 3 dimensions', 'deprived in 4 dimensions'],
    lsoa,
};

fs.writeFileSync(output_path, JSON.stringify(output), 'utf-8');

const total_households = Object.values(lsoa).flat().reduce((sum, count) => sum + count, 0);

console.log(`${Object.keys(lsoa).length} LSOAs, ${total_households.toLocaleString('en-GB')} households`);
console.log(`"Does not apply" households skipped: ${skipped_households}`);
if (extra.length > 0) console.log(`${extra.length} LSOAs not on the map were left out`);
if (empty.length > 0) console.log(`${empty.length} LSOAs have no households`);
console.log('LSOA_2021_deprivation.json GENERATED');
