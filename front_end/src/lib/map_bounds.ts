import { MercatorCoordinate, type LngLatLike } from 'maplibre-gl';

import type { BoundingBox } from '../types';

// Area covered by the data (England & Wales), [west, south, east, north]
export const DATA_BOUNDS: BoundingBox = [-6.45, 49.85, 1.80, 55.85];

/** A bounding box grown by a fraction of its own width and height on every side */
function pad(bbox: BoundingBox, ratio: number): BoundingBox {
    const [west, south, east, north] = bbox;
    const dx = (east - west) * ratio;
    const dy = (north - south) * ratio;
    return [west - dx, south - dy, east + dx, north + dy];
}

// Panning limit: padded by 3/4 of the data's extent on every side, so an area
// selected near the coast or a border can still be moved clear of the docked
// details panel (or the bottom sheet on phones)
export const PAN_BOUNDS = pad(DATA_BOUNDS, 0.75);

// MapLibre draws the world 512 px wide at zoom 0
const WORLD_SIZE_AT_ZOOM_0 = 512;

/** Space kept clear around the map's edges, in pixels */
export interface ClearSpace {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

/**
 * Highest zoom at which a bounding box fits inside the map, minus the clear space.
 * Worked out directly from Web Mercator so it doesn't depend on the map's current padding.
 */
export function zoom_to_fit(bbox: BoundingBox, width: number, height: number, clear: ClearSpace): number {
    const [west, south, east, north] = bbox;
    const top_left = MercatorCoordinate.fromLngLat([west, north]);
    const bottom_right = MercatorCoordinate.fromLngLat([east, south]);

    // Size of the box at zoom 0, in pixels (at least 1 px so a point doesn't zoom forever)
    const box_width = Math.max((bottom_right.x - top_left.x) * WORLD_SIZE_AT_ZOOM_0, 1e-9);
    const box_height = Math.max((bottom_right.y - top_left.y) * WORLD_SIZE_AT_ZOOM_0, 1e-9);

    const room_x = Math.max(1, width - clear.left - clear.right);
    const room_y = Math.max(1, height - clear.top - clear.bottom);

    return Math.log2(Math.min(room_x / box_width, room_y / box_height));
}

/**
 * The map centre that puts a bounding box's centre in the middle of the clear space at a zoom.
 * The clear space's middle is offset from the map's middle by half the difference
 * between opposite margins, so the map centre moves the other way by that much.
 */
export function centre_in_clear_space(bbox: BoundingBox, zoom: number, clear: ClearSpace): LngLatLike {
    const [west, south, east, north] = bbox;
    const top_left = MercatorCoordinate.fromLngLat([west, north]);
    const bottom_right = MercatorCoordinate.fromLngLat([east, south]);

    const pixels_per_unit = WORLD_SIZE_AT_ZOOM_0 * 2 ** zoom;
    const offset_x = (clear.left - clear.right) / 2 / pixels_per_unit;
    const offset_y = (clear.top - clear.bottom) / 2 / pixels_per_unit;

    const centre = new MercatorCoordinate(
        (top_left.x + bottom_right.x) / 2 - offset_x,
        (top_left.y + bottom_right.y) / 2 - offset_y
    );
    return centre.toLngLat();
}
