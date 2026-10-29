import fs from 'node:fs';
import path from 'node:path';
import csv from 'csv-parser';

// Shared by crimes_maker.mjs (full rebuild) and update_crime_data.mjs (new months only).

const street_file_suffix = '-street.csv';

// British Transport Police polices railways across every territorial force,
// so its rows say nothing about which force an LSOA belongs to
const non_territorial_forces = new Set(['btp']);

/**
 * Force slug from a Police.uk file name: "2026-04-avon-and-somerset-street.csv" → "avon-and-somerset".
 */
export function force_from_file_name(file_name) {
    return file_name.slice('YYYY-MM-'.length, -street_file_suffix.length);
}

/**
 * Street-level crime files in one month folder, sorted by name.
 */
export function street_files(month_dir) {
    return fs.readdirSync(month_dir)
        .filter(file => file.endsWith(street_file_suffix))
        .sort();
}

/**
 * Count crimes per LSOA and crime type for one month folder of Police.uk CSVs.
 *
 * crime_lookup is extended in place with any crime type not seen before, so
 * crime ids stay identical across every month file.
 *
 * Returns:
 *  - crime_data:  { crime_lookup, lsoa: { code: { crime_id: count } } }, the app's month format
 *  - forces:      slugs of the forces that published this month
 *  - rows:        total CSV rows read
 *  - lsoa_forces: { code: { force_slug: rows } } from territorial forces, for the coverage lookup
 */
export async function build_month(month_dir, crime_lookup) {

    const crime_type_to_id = new Map(crime_lookup.map((crime_type, id) => [crime_type, id]));
    const lsoa_crime_dictionary = {};
    const lsoa_forces = {};
    const forces = [];
    let rows = 0;

    for (const file of street_files(month_dir)) {

        const force = force_from_file_name(file);
        forces.push(force);

        await new Promise((resolve, reject) => {

            fs.createReadStream(path.join(month_dir, file))
                .pipe(csv())

                .on('data', row => {

                    const lsoa = row['LSOA code'];
                    const crime_type = row['Crime type'];

                    if (!crime_type_to_id.has(crime_type)) {
                        crime_type_to_id.set(crime_type, crime_lookup.length);
                        crime_lookup.push(crime_type);
                    }

                    const crime_id = crime_type_to_id.get(crime_type);

                    lsoa_crime_dictionary[lsoa] ??= {};
                    lsoa_crime_dictionary[lsoa][crime_id] = (lsoa_crime_dictionary[lsoa][crime_id] ?? 0) + 1;

                    if (lsoa && !non_territorial_forces.has(force)) {
                        lsoa_forces[lsoa] ??= {};
                        lsoa_forces[lsoa][force] = (lsoa_forces[lsoa][force] ?? 0) + 1;
                    }

                    rows++;
                })

                .on('end', resolve)
                .on('error', reject);
        });
    }

    return {
        crime_data: { crime_lookup, lsoa: lsoa_crime_dictionary },
        forces,
        rows,
        lsoa_forces,
    };
}

/**
 * Write a month in the JSON layout the app reads.
 */
export function write_month_json(file_path, crime_data) {
    // Compact (no indentation): half the size of pretty-printed JSON, so the app downloads and parses it faster
    fs.writeFileSync(file_path, JSON.stringify(crime_data), 'utf-8');
}
