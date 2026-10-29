import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

import { build_month, street_files, force_from_file_name, write_month_json } from './lib/crime_month.mjs';
import { run_correlations } from './correlation_maker.mjs';

// Checks Police.uk for a newer month of crime data and, if there is one,
// downloads the archive, converts the new months to the app's format,
// updates the coverage files and recomputes the precomputed statistics.
//
//   npm run update-data                       normal daily run
//   npm run update-data -- --dry-run          only report what would be added
//   npm run update-data -- --zip <path>       use an already downloaded archive
//   npm run update-data -- --backfill         one-off: build coverage files from local data_raw first
//
// Exits non-zero on any failure, so a scheduled run goes red instead of committing bad data.

const LAST_UPDATED_URL = 'https://data.police.uk/api/crime-last-updated';
const ARCHIVE_URL = 'https://data.police.uk/data/archive/latest.zip';

// Sanity limits for a new month; a real month has ~40 forces and ~450k rows
const MIN_FORCE_FILES = 30;
const MIN_ROWS = 300_000;

// Greater Manchester Police has not published since 2019, so its LSOAs never
// appear in the data; recognise them by council name (exact match, before " 001A")
const GREATER_MANCHESTER_COUNCILS = new Set([
    'Bolton', 'Bury', 'Manchester', 'Oldham', 'Rochdale',
    'Salford', 'Stockport', 'Tameside', 'Trafford', 'Wigan',
]);

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const raw_crime_dir = path.join(script_dir, '../data_raw/crime');
const front_end_dir = path.join(script_dir, '../../front_end');
const crime_dir = path.join(front_end_dir, 'public/data/crime');
const lsoa_index_path = path.join(front_end_dir, 'public/data/lsoa_index.json');
const manifest_path = path.join(front_end_dir, 'src/data/crime_manifest.json');
const lsoa_forces_path = path.join(front_end_dir, 'public/data/lsoa_forces.json');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const flag_value = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);

const read_json = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const write_json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf-8');

// ~~~~~~~~~~ coverage files ~~~~~~~~~~

/**
 * Add one month's { lsoa: { force: rows } } into a running total.
 */
function add_force_counts(totals, month_counts) {
    for (const [lsoa, forces] of Object.entries(month_counts)) {
        totals[lsoa] ??= {};
        for (const [force, rows] of Object.entries(forces)) {
            totals[lsoa][force] = (totals[lsoa][force] ?? 0) + rows;
        }
    }
}

// "Bristol 012A" → "Bristol"
const council_of = (lsoa_name) => lsoa_name.replace(/ \w{4}$/, '');

/**
 * Assign every LSOA on the map to a police force.
 *
 * Every council in England & Wales lies wholly inside one police force, so the
 * force is decided per council: the force whose files record most of the
 * council's crimes. Deciding per LSOA instead would let a few stray rows (a force
 * recording an incident just over its border) claim LSOAs whose own force never
 * publishes. Greater Manchester's councils are fixed explicitly, since Greater
 * Manchester Police publishes nothing and only stray rows ever appear there.
 *
 * strict: leave a council unassigned unless one force has ≥ 90% of its rows.
 * Used for unattended updates, where only a few months of evidence are available
 * and a council whose force paused publishing would otherwise go to a neighbour.
 */
function assign_forces(force_counts, features, { strict = false } = {}) {
    const council_counts = {};

    for (const feature of features) {
        const council = council_of(feature.lsoaNM);
        for (const [force, rows] of Object.entries(force_counts[feature.lsoa] ?? {})) {
            council_counts[council] ??= {};
            council_counts[council][force] = (council_counts[council][force] ?? 0) + rows;
        }
    }

    const council_force = (council) => {
        if (GREATER_MANCHESTER_COUNCILS.has(council)) {
            return 'greater-manchester';
        }
        const forces = Object.entries(council_counts[council] ?? {}).sort(([, a], [, b]) => b - a);
        if (forces.length === 0) {
            return undefined;
        }

        // A clear majority is expected; anything else deserves a look
        const total = forces.reduce((sum, [, rows]) => sum + rows, 0);
        if (forces[0][1] / total < 0.9) {
            const share = `${(forces[0][1] / total * 100).toFixed(0)}%`;
            if (strict) {
                console.warn(`council ${council}: left unassigned, ${forces[0][0]} has only ${share} of its rows`);
                return undefined;
            }
            console.warn(`council ${council}: ${forces[0][0]} has only ${share} of its rows`);
        }
        return forces[0][0];
    };

    // Warn once per council, not once per LSOA
    const council_force_cache = new Map();
    const cached_council_force = (council) => {
        if (!council_force_cache.has(council)) {
            council_force_cache.set(council, council_force(council));
        }
        return council_force_cache.get(council);
    };

    const assigned = {};
    for (const feature of features) {
        const force = cached_council_force(council_of(feature.lsoaNM));
        if (force) {
            assigned[feature.lsoa] = force;
        }
    }
    return assigned;
}

// Every LSOA on the map as { lsoa, lsoaNM }
const load_features = () => {
    const index = read_json(lsoa_index_path);
    return index.lsoa.map((lsoa, i) => ({ lsoa, lsoaNM: index.name[i] }));
};

function load_lsoa_forces() {
    if (!fs.existsSync(lsoa_forces_path)) {
        return {};
    }
    const { forces, lsoa } = read_json(lsoa_forces_path);
    return Object.fromEntries(Object.entries(lsoa).map(([code, index]) => [code, forces[index]]));
}

function save_lsoa_forces(assigned) {
    const forces = [...new Set(Object.values(assigned))].sort();
    const force_index = new Map(forces.map((force, i) => [force, i]));
    const lsoa = Object.fromEntries(
        Object.keys(assigned).sort().map(code => [code, force_index.get(assigned[code])])
    );
    // Compact: one line per force list, no indentation for 35k LSOAs
    fs.writeFileSync(lsoa_forces_path, JSON.stringify({ forces, lsoa }) + '\n', 'utf-8');
}

function load_manifest() {
    return fs.existsSync(manifest_path) ? read_json(manifest_path) : { months: [], forces_by_month: {} };
}

function save_manifest(manifest) {
    manifest.months.sort();
    manifest.forces_by_month = Object.fromEntries(
        manifest.months.map(month => [month, manifest.forces_by_month[month]])
    );
    write_json(manifest_path, manifest);
}

/**
 * One-off: build the manifest and LSOA → force lookup from the months already on disk.
 */
async function backfill(manifest) {
    const months = fs.readdirSync(crime_dir)
        .map(file => file.replace(/\.json$/, ''))
        .filter(month => /^\d{4}-\d{2}$/.test(month))
        .sort();

    const missing_raw = months.filter(month => !fs.existsSync(path.join(raw_crime_dir, month)));
    if (missing_raw.length) {
        throw new Error(`--backfill needs the raw CSVs in data_raw/crime for: ${missing_raw.join(', ')}`);
    }

    const force_counts = {};

    for (const month of months) {
        const month_dir = path.join(raw_crime_dir, month);
        // build_month also returns which LSOAs each force's rows fall in; the crime counts are discarded
        const { lsoa_forces } = await build_month(month_dir, []);

        add_force_counts(force_counts, lsoa_forces);
        manifest.forces_by_month[month] = street_files(month_dir).map(force_from_file_name);
        if (!manifest.months.includes(month)) {
            manifest.months.push(month);
        }
        console.log(`backfill ${month}: ${manifest.forces_by_month[month].length} forces`);
    }

    const assigned = assign_forces(force_counts, load_features());
    save_lsoa_forces(assigned);
    save_manifest(manifest);

    console.log(`backfill: ${months.length} months, ${Object.keys(assigned).length} LSOAs assigned to a force`);
}

// ~~~~~~~~~~ download ~~~~~~~~~~

// "2026-04" → "2026-05". Date.UTC counts months from 0, so passing the
// 1-based month number lands on the following month (and rolls over the year).
const next_month = (month) => {
    const [year, month_number] = month.split('-').map(Number);
    return new Date(Date.UTC(year, month_number)).toISOString().slice(0, 7);
};

async function latest_published_month() {
    const response = await fetch(LAST_UPDATED_URL);
    if (!response.ok) {
        throw new Error(`${LAST_UPDATED_URL} returned ${response.status}`);
    }
    const { date } = await response.json();
    return date.slice(0, 7);
}

async function download_archive(destination) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await fetch(ARCHIVE_URL);
            if (!response.ok || !response.body) {
                throw new Error(`${ARCHIVE_URL} returned ${response.status}`);
            }

            const size_mb = Number(response.headers.get('content-length') ?? 0) / 1e6;
            console.log(`downloading ${ARCHIVE_URL} (${size_mb.toFixed(0)} MB)…`);

            await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
            return;

        } catch (error) {
            if (attempt === 2) {
                throw error;
            }
            console.warn(`download failed (${error.message}), retrying once…`);
        }
    }
}

// ~~~~~~~~~~ main ~~~~~~~~~~

async function main() {
    const manifest = load_manifest();

    if (flag('--backfill')) {
        await backfill(manifest);
    }

    if (manifest.months.length === 0) {
        throw new Error('crime_manifest.json is missing or empty; run once with --backfill');
    }

    const our_latest = manifest.months[manifest.months.length - 1];
    const police_latest = await latest_published_month();

    if (police_latest <= our_latest) {
        console.log(`up to date: Police.uk latest is ${police_latest}, we have ${our_latest}`);
        return;
    }

    const expected = [];
    for (let month = next_month(our_latest); month <= police_latest; month = next_month(month)) {
        expected.push(month);
    }
    console.log(`Police.uk has ${police_latest}, we have ${our_latest}: new months ${expected.join(', ')}`);

    if (flag('--dry-run')) {
        return;
    }

    const zip_path = flag_value('--zip') ?? path.join(os.tmpdir(), `police-uk-${police_latest}.zip`);
    const downloaded = !flag_value('--zip');

    try {
        if (downloaded) {
            await download_archive(zip_path);
        }

        // Months in the archive that we don't have yet
        const listing = execFileSync('unzip', ['-Z1', zip_path], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
        const new_months = [...new Set(
            listing.split('\n')
                .filter(entry => entry.endsWith('-street.csv'))
                .map(entry => entry.slice(0, 7))
        )].filter(month => month > our_latest).sort();

        if (new_months.length === 0) {
            throw new Error(`archive has no months after ${our_latest}, although the API reports ${police_latest}`);
        }

        // Extract only the street-level files of the new months (outcomes and stop-and-search are not used)
        fs.mkdirSync(raw_crime_dir, { recursive: true });
        execFileSync('unzip', ['-o', '-q', zip_path, ...new_months.map(month => `${month}/*-street.csv`), '-d', raw_crime_dir]);

        // Keep crime ids identical to the existing files
        const crime_lookup = read_json(path.join(crime_dir, `${our_latest}.json`)).crime_lookup;
        const known_crime_types = new Set(crime_lookup);
        const assigned = load_lsoa_forces();

        // Build and validate every month before writing anything
        const built = [];
        for (const month of new_months) {
            const result = await build_month(path.join(raw_crime_dir, month), crime_lookup);

            if (result.forces.length < MIN_FORCE_FILES || result.rows < MIN_ROWS) {
                throw new Error(`${month} looks incomplete: ${result.forces.length} force files, ${result.rows} rows`);
            }
            console.log(`${month}: ${result.rows.toLocaleString('en-GB')} crimes from ${result.forces.length} forces`);
            built.push({ month, ...result });
        }

        const new_crime_types = crime_lookup.filter(crime_type => !known_crime_types.has(crime_type));
        if (new_crime_types.length) {
            console.warn(`new crime types added to the lookup: ${new_crime_types.join(', ')}`);
        }

        // Write: month files, coverage, then the statistics that depend on them
        const force_counts = {};
        for (const { month, crime_data, forces, lsoa_forces } of built) {
            write_month_json(path.join(crime_dir, `${month}.json`), crime_data);
            manifest.months.push(month);
            manifest.forces_by_month[month] = forces;
            add_force_counts(force_counts, lsoa_forces);
        }

        // Existing assignments never move (council boundaries don't change between months).
        // Only areas we couldn't place before are voted on, and only with a clear majority.
        const unassigned = load_features().filter(feature => !assigned[feature.lsoa]);
        if (unassigned.length) {
            Object.assign(assigned, assign_forces(force_counts, unassigned, { strict: true }));
        }

        save_lsoa_forces(assigned);
        save_manifest(manifest);
        run_correlations({ log: () => {} });

        console.log(`added ${new_months.join(', ')}`);

    } finally {
        if (downloaded && fs.existsSync(zip_path)) {
            fs.rmSync(zip_path);
        }
    }
}

main().catch(error => {
    console.error(`update failed: ${error.message}`);
    process.exit(1);
});
