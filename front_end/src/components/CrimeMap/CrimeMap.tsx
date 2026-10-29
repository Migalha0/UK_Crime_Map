import { useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, setWorkerUrl, type MapLayerMouseEvent, type StyleSpecification } from 'maplibre-gl';
// The map's background worker (cuts the boundaries into tiles off the main thread), served as its own file
import worker_url from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

import { BOUNDARIES_URL } from '../../data/load_data';
import { DATA_BOUNDS, PAN_BOUNDS, centre_in_clear_space, zoom_to_fit, type ClearSpace } from '../../lib/map_bounds';
import { EMPTY_FILL, HIGHLIGHT_CASING_PAINT, HIGHLIGHT_PAINT, SEAM_PAINT } from '../../lib/map_style';
import type { MapOverlay } from '../../lib/map_overlays';
import type { LsoaArea } from '../../types';

setWorkerUrl(worker_url);

// Width of the docked area panel plus its margin, so a selected area is never centred under it
const DOCKED_PANEL_SPACE = 340 + 10 + 16;

// Phones show the area details as a bottom sheet instead
const BOTTOM_SHEET_QUERY = '(max-width: 639px)';
const BOTTOM_SHEET_HEIGHT = 0.6;

const MAX_ZOOM = 15;

// Closest a selection zooms in, so a tiny city-centre area still shows its surroundings
const SELECTION_MAX_ZOOM = 13;

// Zoom levels to stay out from the tightest fit, so the area sits in its neighbourhood
// rather than filling the screen
const SELECTION_ZOOM_MARGIN = 1.5;

// Gap between the cursor and the bottom of the hover label
const LABEL_OFFSET = 14;

const SOURCE = 'lsoa';
const FILL_LAYER = 'lsoa-fill';

// Satellite base map, then the areas: fill, thin seams, and the hover/selection outline on top.
// The boundaries are loaded and cut into tiles by MapLibre's worker, never parsed on the main thread.
const MAP_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        satellite: {
            type: 'raster',
            // Esri World Imagery (no API key needed)
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Imagery &copy; Esri',
        },
        [SOURCE]: {
            type: 'geojson',
            data: BOUNDARIES_URL,
            // Identify areas by their LSOA code, so per-area state can be set by code
            promoteId: 'lsoa',
            // Tiles are cut up to zoom 14 and scaled beyond that: plenty for these boundaries
            maxzoom: 14,
        },
    },
    layers: [
        { id: 'satellite', type: 'raster', source: 'satellite' },
        { id: FILL_LAYER, type: 'fill', source: SOURCE, paint: { 'fill-color': EMPTY_FILL } },
        { id: 'lsoa-seams', type: 'line', source: SOURCE, paint: SEAM_PAINT },
        { id: 'lsoa-highlight-casing', type: 'line', source: SOURCE, paint: HIGHLIGHT_CASING_PAINT },
        { id: 'lsoa-highlight', type: 'line', source: SOURCE, paint: HIGHLIGHT_PAINT },
    ],
};

const NO_CLEAR_SPACE: ClearSpace = { top: 0, right: 0, bottom: 0, left: 0 };

interface CrimeMapProps {
    areas?: LsoaArea[];
    /** What the areas are coloured by (crime, deprivation or ethnicity); null until it has loaded */
    overlay: MapOverlay | null;
    selectedLsoa: string | null;
    onSelect: (lsoa: string | null) => void;
    /** Called once the boundaries have loaded and the areas can be drawn */
    onBoundariesLoaded: () => void;
}

/**
 * WebGL map (MapLibre) of England & Wales with every LSOA coloured by the chosen overlay.
 * Hover to outline an area and see its name, click to select and zoom to it,
 * click outside the areas to clear the selection.
 *
 * Panning and zooming happen on the GPU, and the boundaries are tiled and coloured in a
 * background worker, so moving the map never waits on the main thread (see map_style.ts).
 */
export default function CrimeMap({ areas, overlay, selectedLsoa, onSelect, onBoundariesLoaded }: CrimeMapProps) {
    const container = useRef<HTMLDivElement>(null);
    const [map, set_map] = useState<MapLibreMap | null>(null);
    const [error, set_error] = useState<string | null>(null);

    const area_by_lsoa = useMemo(() => new Map(areas?.map(area => [area.lsoa, area])), [areas]);

    // Latest values for the map's event handlers, which are bound once
    const latest = useRef({ onSelect, onBoundariesLoaded, area_by_lsoa, overlay });
    useEffect(() => {
        latest.current = { onSelect, onBoundariesLoaded, area_by_lsoa, overlay };
    });

    // Create the map once
    useEffect(() => {
        let created: MapLibreMap;
        try {
            created = new MapLibreMap({
                container: container.current!,
                style: MAP_STYLE,
                bounds: DATA_BOUNDS,
                maxBounds: PAN_BOUNDS,
                maxZoom: MAX_ZOOM,
                renderWorldCopies: false,
                // A flat 2D map: no rotating or tilting
                dragRotate: false,
                pitchWithRotate: false,
                touchPitch: false,
                attributionControl: { compact: true },
            });
        } catch {
            set_error('This map needs WebGL 2, which this browser or device has turned off.');
            return;
        }

        created.touchZoomRotate.disableRotation();
        created.keyboard.disableRotation();
        created.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

        // Never zoom out past England & Wales filling the view, on any screen size
        const update_min_zoom = () => {
            const { clientWidth, clientHeight } = created.getContainer();
            created.setMinZoom(Math.max(0, zoom_to_fit(DATA_BOUNDS, clientWidth, clientHeight, NO_CLEAR_SPACE)));
        };
        update_min_zoom();
        created.on('resize', update_min_zoom);

        // MapLibre only watches window resizes; also catch layout changes (e.g. the month bar wrapping)
        const observer = new ResizeObserver(() => created.resize());
        observer.observe(container.current!);

        const on_source_data = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
            if (e.sourceId === SOURCE && e.isSourceLoaded) {
                created.off('sourcedata', on_source_data);
                latest.current.onBoundariesLoaded();
            }
        };
        created.on('sourcedata', on_source_data);

        created.once('load', () => set_map(created));

        return () => {
            observer.disconnect();
            created.remove();
            set_map(null);
        };
    }, []);

    // Hover outline + name label, and click to select
    useEffect(() => {
        if (!map) {
            return;
        }


        // One label element moved straight to the pointer on every event: no layout reads, no lag
        const label = document.createElement('div');
        label.className = 'area-tooltip';
        label.hidden = true;
        map.getContainer().append(label);

        let hovered: string | null = null;
        let moving = false;

        const on_mouse_move = (e: MapLayerMouseEvent) => {
            const lsoa = e.features?.[0]?.properties.lsoa as string | undefined;
            if (!lsoa) {
                return;
            }

            // Name plus the overlay's value, e.g. "Stockport 037B · 12 crimes"
            const name = latest.current.area_by_lsoa.get(lsoa)?.lsoaNM ?? lsoa;
            const value = latest.current.overlay?.describe(lsoa);
            const text = value ? `${name} · ${value}` : name;
            if (label.textContent !== text) {
                label.textContent = text;
            }

            if (lsoa !== hovered) {
                // Removed rather than set to false, so only the hovered and selected areas ever carry state
                if (hovered) map.removeFeatureState({ source: SOURCE, id: hovered }, 'hover');
                map.setFeatureState({ source: SOURCE, id: lsoa }, { hover: true });
                hovered = lsoa;
            }

            label.hidden = moving;
            label.style.transform = `translate(calc(${e.point.x}px - 50%), calc(${e.point.y - LABEL_OFFSET}px - 100%))`;
            map.getCanvas().style.cursor = 'pointer';
        };

        const on_mouse_leave = () => {
            if (hovered) map.removeFeatureState({ source: SOURCE, id: hovered }, 'hover');
            hovered = null;
            label.hidden = true;
            map.getCanvas().style.cursor = '';
        };

        // The label would point at the wrong place while the map moves under it
        const on_move_start = () => {
            moving = true;
            label.hidden = true;
        };
        const on_move_end = () => {
            moving = false;
        };

        // A click on an area selects it; anywhere else clears the selection
        const on_click = (e: MapLayerMouseEvent) => {
            const [feature] = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
            latest.current.onSelect((feature?.properties.lsoa as string | undefined) ?? null);
        };

        map.on('mousemove', FILL_LAYER, on_mouse_move);
        map.on('mouseleave', FILL_LAYER, on_mouse_leave);
        map.on('movestart', on_move_start);
        map.on('moveend', on_move_end);
        map.on('click', on_click);

        return () => {
            map.off('mousemove', FILL_LAYER, on_mouse_move);
            map.off('mouseleave', FILL_LAYER, on_mouse_leave);
            map.off('movestart', on_move_start);
            map.off('moveend', on_move_end);
            map.off('click', on_click);
            label.remove();
        };
    }, [map]);

    // Colour every area for the overlay with one new paint expression; the worker re-colours the tiles
    useEffect(() => {
        if (map && overlay) {
            map.setPaintProperty(FILL_LAYER, 'fill-color', overlay.fill);
        }
    }, [map, overlay]);

    // Outline the selected area
    useEffect(() => {
        if (!map || !selectedLsoa) {
            return;
        }

        map.setFeatureState({ source: SOURCE, id: selectedLsoa }, { selected: true });
        return () => {
            map.removeFeatureState({ source: SOURCE, id: selectedLsoa }, 'selected');
        };
    }, [map, selectedLsoa]);

    // Centre a newly selected area in the space left clear of the details panel, and zoom so it fits:
    //  - zoom in when it would be small on screen, never past SELECTION_MAX_ZOOM;
    //  - zoom out when it doesn't fit (e.g. a big area clicked while zoomed in on a small one);
    //  - otherwise keep the current zoom and only move the map.
    useEffect(() => {
        const area = selectedLsoa && area_by_lsoa.get(selectedLsoa);
        if (!map || !area) {
            return;
        }

        const { clientWidth: width, clientHeight: height } = map.getContainer();
        const clear: ClearSpace = window.matchMedia(BOTTOM_SHEET_QUERY).matches
            ? { top: 24, right: 24, bottom: Math.round(height * BOTTOM_SHEET_HEIGHT) + 24, left: 24 }
            : { top: 24, right: 24, bottom: 24, left: DOCKED_PANEL_SPACE };

        // Highest zoom at which the whole area fits in the clear space
        const tightest_zoom = zoom_to_fit(area.bbox, width, height, clear);
        const target_zoom = Math.min(tightest_zoom - SELECTION_ZOOM_MARGIN, SELECTION_MAX_ZOOM);

        const current_zoom = map.getZoom();
        const zoom = current_zoom < target_zoom || current_zoom > tightest_zoom ? target_zoom : current_zoom;

        map.flyTo({ center: centre_in_clear_space(area.bbox, zoom, clear), zoom, duration: 600 });
        // area_by_lsoa only fills in once; re-run then in case an area was selected before it loaded
    }, [map, selectedLsoa, area_by_lsoa]);

    return (
        <div
            ref={container}
            // only show the focus ring for keyboard users, not after every click
            className="h-full border border-ink bg-map focus-within:not-focus-visible:outline-none"
        >
            {error && <p className="m-0 p-6 text-center text-sm text-white">{error}</p>}
        </div>
    );
}
