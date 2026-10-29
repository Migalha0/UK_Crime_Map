import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import csv from 'csv-parser';

// Census 2021 ethnic group (19 categories) per LSOA → the app's 13 groups plus total_population,
// written to front_end/public/data/LSOA_2021_demography.json.
// Run: npm run demography

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const demography_csv = path.join(script_dir, '../data_raw/UK_demography.csv');
const output_path = path.join(script_dir, '../../front_end/public/data/LSOA_2021_demography.json');

// creating lookup table so we can more easily append data
const race_id_to_type = {
  '1': 'south_asian',
  '2': 'chinese',
  '3': 'south_asian',
  '4': 'south_asian',
  '5': 'other_asian',
  '6': 'black',
  '7': 'black',
  '8': 'black',
  '9': 'asian_white',
  '10': 'black_white',
  '11': 'black_white',
  '12': 'mixed',
  '13': 'british',
  '14': 'irish',
  '15': 'gypsy',
  '16': 'gypsy',
  '17': 'non_british_white',
  '18': 'arab',
  '19': 'other',
};

// creating national demography object
const uk_demography = {};

// reading demography csv
await new Promise ((resolve, reject) => {
    fs.createReadStream(demography_csv)
    .pipe(csv([
        'lsoa_code',
        'race_id',
        'race_type',
        'observation'
    ]))
    .on('data', (row) => {

        // stating variables to make life easier
        const lsoa = row.lsoa_code;
        
        const race_id = row.race_id;
        const race_type = row.race_type;

        const race = race_id_to_type[race_id];
        const race_count = row.observation;

        // check if lsoa exists
        if(!uk_demography[lsoa]){
            uk_demography[lsoa] = {};
        }

        // check if race has already been recorded in the lsoa
        if(race in uk_demography[lsoa]){
            uk_demography[lsoa][race] += Number(race_count);
        } else {
            uk_demography[lsoa][race] = Number(race_count);
        }

    })
    .on('end', resolve)
    .on('error', reject)
});


// iterating through each lsoa feature and adding up total population
for(const [lsoa,data] of Object.entries(uk_demography)){
    
    let total = 0;
    
    for(const count of Object.values(data)){
        total += count;
    }
    
    data.total_population = total;
}

// Compact (no indentation): about 30% smaller than pretty-printed, for a faster download
fs.writeFileSync(output_path, JSON.stringify(uk_demography), 'utf-8');

console.log('DEMOGRAPHY FILE CREATED')