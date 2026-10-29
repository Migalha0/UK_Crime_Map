import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build_month, write_month_json } from './lib/crime_month.mjs';

// Full rebuild: one crime file per month folder in data_raw/crime.
// For adding new months only, use update_crime_data.mjs instead.

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const folder_path = path.join(script_dir, '../data_raw/crime');
const output_path = path.join(script_dir, '../../front_end/public/data/crime');

const folders = fs.readdirSync(folder_path)
    .filter(folder => /^\d{4}-\d{2}$/.test(folder))
    .sort();

// Shared across months so a crime type keeps the same id in every file
const crime_lookup = [];

for (const folder of folders) {

    const { crime_data } = await build_month(path.join(folder_path, folder), crime_lookup);

    write_month_json(path.join(output_path, `${folder}.json`), crime_data);

    console.log(`${folder}.json GENERATED`);
}
