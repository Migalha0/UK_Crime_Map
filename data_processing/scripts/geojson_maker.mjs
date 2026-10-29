import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Turns the ONS LSOA 2021 boundaries into the two files the app reads:
//
//  front_end/public/data/lsoa_boundaries.json
//      GeoJSON for the map, drawn by MapLibre in a background worker.
//      Each feature keeps only { lsoa } in its properties, and coordinates are
//      rounded to 6 decimals (about 10 cm), which is far finer than the boundaries' own
//      accuracy and cuts the file to well under half its size.
//
//  front_end/public/data/lsoa_index.json
//      Everything else the app needs about each area, without any shapes:
//      { "lsoa": [codes], "name": [names], "bbox": [[west, south, east, north], ...] }
//      Small enough to load and use on the main thread (statistics, the details
//      panel, zooming to a selected area) while the map handles the shapes.
//
// Input: data_raw/LSOA_2021_geometry.json (ONS "LSOA (Dec 2021) Boundaries", WGS84).
// Run: npm run boundaries

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const input_path = path.join(script_dir, '../data_raw/LSOA_2021_geometry.json');
const data_dir = path.join(script_dir, '../../front_end/public/data');

const source = JSON.parse(fs.readFileSync(input_path, 'utf-8'));

const round = (value, decimals) => Math.round(value * 10 ** decimals) / 10 ** decimals;

// Round every [lon, lat] pair, dropping points that become identical to the previous one
function round_ring(ring) {
    const rounded = [];
    for (const [lon, lat] of ring) {
        const point = [round(lon, 6), round(lat, 6)];
        const previous = rounded[rounded.length - 1];
        if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
            rounded.push(point);
        }
    }
    return rounded;
}

function round_geometry(geometry) {
    if (geometry.type === 'Polygon') {
        return { type: 'Polygon', coordinates: geometry.coordinates.map(round_ring) };
    }
    if (geometry.type === 'MultiPolygon') {
        return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon => polygon.map(round_ring)) };
    }
    throw new Error(`Unexpected geometry type ${geometry.type}`);
}

// [west, south, east, north] of every point in the geometry
function bounding_box(geometry) {
    const rings = geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
    let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
    for (const ring of rings) {
        for (const [lon, lat] of ring) {
            west = Math.min(west, lon);
            east = Math.max(east, lon);
            south = Math.min(south, lat);
            north = Math.max(north, lat);
        }
    }
    return [west, south, east, north].map(value => round(value, 5));
}

const features = source.features
    .map(feature => ({
        type: 'Feature',
        properties: { lsoa: feature.properties.LSOA21CD },
        geometry: round_geometry(feature.geometry),
        name: feature.properties.LSOA21NM,
    }))
    .sort((a, b) => a.properties.lsoa.localeCompare(b.properties.lsoa));

const codes = new Set(features.map(feature => feature.properties.lsoa));
if (codes.size !== features.length) {
    throw new Error(`Duplicate LSOA codes: ${features.length} features but ${codes.size} codes`);
}

const boundaries = {
    type: 'FeatureCollection',
    features: features.map(({ type, properties, geometry }) => ({ type, properties, geometry })),
};

const index = {
    lsoa: features.map(feature => feature.properties.lsoa),
    name: features.map(feature => feature.name),
    bbox: features.map(feature => bounding_box(feature.geometry)),
};

fs.writeFileSync(path.join(data_dir, 'lsoa_boundaries.json'), JSON.stringify(boundaries), 'utf-8');
fs.writeFileSync(path.join(data_dir, 'lsoa_index.json'), JSON.stringify(index), 'utf-8');

const size_mb = (file) => (fs.statSync(path.join(data_dir, file)).size / 1e6).toFixed(1);
console.log(`${features.length} LSOAs`);
console.log(`lsoa_boundaries.json GENERATED (${size_mb('lsoa_boundaries.json')} MB)`);
console.log(`lsoa_index.json GENERATED (${size_mb('lsoa_index.json')} MB)`);
