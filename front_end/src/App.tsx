import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import AppHeader from './components/AppHeader/AppHeader';
import CrimeMap from './components/CrimeMap/CrimeMap';
import AreaView from './components/AreaDetails/AreaView';
import AnalysisPanels from './components/panels/AnalysisPanels';
import MapLayers from './components/MapLayers/MapLayers';
import MapStatus from './components/MapStatus/MapStatus';
import Overview from './components/Overview/Overview';
import AreaSearch from './components/Sidebar/AreaSearch';
import MonthControl from './components/Sidebar/MonthControl';
import Sidebar, { sheet_height, type SheetSnap } from './components/Sidebar/Sidebar';
import Tabs, { panel_id, tab_id } from './components/Sidebar/Tabs';
import { useStaticData } from './hooks/useStaticData';
import { useMonthData } from './hooks/useMonthData';
import { DESKTOP_QUERY, useMediaQuery } from './hooks/useMediaQuery';
import { useElementHeight } from './hooks/useElementHeight';
import { get_country_crime } from './data/crime_stats';
import { LATEST_MONTH, format_month } from './data/months';
import { crime_overlay, deprivation_overlay, ethnicity_overlay, type OverlayId } from './lib/map_overlays';
import type { ClearSpace } from './lib/map_bounds';
import type { Group } from './data/demography_groups';
import type { MonthSummary } from './types';

type TabId = 'area' | 'insights';

// On phones the layer card runs along the top of the map; keep selections clear of it
const MOBILE_LAYER_CARD_SPACE = 120;
const MOBILE_LAYER_CARD_SPACE_WITH_GROUP = 160;

/**
 * Layout: header on top; below it the map, with the controls and details in a sidebar
 * docked on its left on wide screens, or in a bottom sheet over it on phones and tablets.
 */
export default function App() {
    const [selected_month, set_selected_month] = useState(LATEST_MONTH);

    // LSOA code of the area whose details are open; kept when the month changes
    const [selected_lsoa, set_selected_lsoa] = useState<string | null>(null);
    // Whether that selection came from the search box (then focus moves to its details)
    const [selected_by_search, set_selected_by_search] = useState(false);

    const [tab, set_tab] = useState<TabId>('area');
    const [snap, set_snap] = useState<SheetSnap>('peek');

    const is_desktop = useMediaQuery(DESKTOP_QUERY);
    const map_area = useRef<HTMLDivElement>(null);
    const map_height = useElementHeight(map_area);

    const { data: static_data, error: static_error } = useStaticData();
    const month_data = useMonthData(selected_month);

    // Everything derived from the loaded month's crime dataset
    const summary = useMemo<MonthSummary | null>(() => {
        if (!static_data || !month_data.crime_data || !month_data.month) {
            return null;
        }

        const { crime_data } = month_data;
        const coverage = static_data.coverage_for(month_data.month);

        return {
            month: month_data.month,
            crime_data,
            coverage,
            countryCrime: get_country_crime(crime_data),
            correlations: static_data.correlate(crime_data, coverage),
        };
    }, [static_data, month_data]);

    // What the map's areas are coloured by, and which group the ethnicity map shows
    const [overlay_id, set_overlay_id] = useState<OverlayId>('crime');
    const [overlay_group, set_overlay_group] = useState<Group>('british');

    // Set by the map once its boundaries have loaded
    const [boundaries_loaded, set_boundaries_loaded] = useState(false);

    const area_by_lsoa = useMemo(
        () => new Map(static_data?.areas.map(area => [area.lsoa, area])),
        [static_data]
    );
    const selected_feature = selected_lsoa ? area_by_lsoa.get(selected_lsoa) : undefined;

    // Selecting an area shows its details: the Area tab, and on phones the sheet pulled up halfway
    const select_area = (lsoa: string | null, from_search = false) => {
        set_selected_lsoa(lsoa);
        set_selected_by_search(from_search);
        if (lsoa) {
            set_tab('area');
            if (snap === 'peek' || snap === 'full') set_snap('half');
        }
    };

    // Escape closes the area details
    useEffect(() => {
        const on_key_down = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                set_selected_lsoa(null);
            }
        };
        window.addEventListener('keydown', on_key_down);
        return () => window.removeEventListener('keydown', on_key_down);
    }, []);

    // Only the crime map changes with the month, so the census maps don't rebuild when it does
    const crime_summary = overlay_id === 'crime' ? summary : null;
    const overlay = useMemo(() => {
        if (!static_data) return null;
        const lsoas = static_data.areas.map(area => area.lsoa);

        switch (overlay_id) {
            case 'crime': return crime_summary && crime_overlay(lsoas, crime_summary);
            case 'deprivation': return deprivation_overlay(lsoas, static_data.deprivation);
            case 'ethnicity': return ethnicity_overlay(lsoas, static_data.demography, overlay_group);
        }
    }, [static_data, overlay_id, overlay_group, crime_summary]);

    // Height of the bottom sheet at rest; the map keeps its controls and selections above it
    const sheet_px = is_desktop ? 0 : sheet_height(snap, map_height);
    const clear_space: ClearSpace = is_desktop
        ? { top: 24, right: 24, bottom: 24, left: 24 }
        : {
            top: overlay_id === 'ethnicity' ? MOBILE_LAYER_CARD_SPACE_WITH_GROUP : MOBILE_LAYER_CARD_SPACE,
            right: 16,
            bottom: sheet_height('half', map_height) + 16,
            left: 16,
        };

    // First view: England & Wales in full, clear of the layer card and the resting sheet on phones
    const initial_clear_space: ClearSpace = is_desktop
        ? { top: 0, right: 0, bottom: 0, left: 0 }
        : { top: MOBILE_LAYER_CARD_SPACE, right: 8, bottom: sheet_height('peek', map_height) + 8, left: 8 };

    const loading_label = !static_data || !boundaries_loaded
        ? 'Loading map data…'
        : month_data.month !== selected_month
            ? `Loading ${format_month(selected_month, 'long')}…`
            : null;

    // Short messages for screen readers when what's on screen changes without focus moving
    const announcement = selected_feature
        ? `Selected ${selected_feature.lsoaNM}`
        : summary ? `Showing ${format_month(summary.month, 'long')}` : '';

    const sidebar_content = (
        <>
            <div className="flex flex-col gap-4 p-4 max-lg:pt-1">
                {static_data && <AreaSearch areas={static_data.areas} onSelect={lsoa => select_area(lsoa, true)} />}
                <MonthControl selected={selected_month} onSelect={set_selected_month} />
            </div>

            {/* Stays in view while the tab's content scrolls under it */}
            <div className="sticky top-0 z-10 bg-surface">
                <Tabs
                    idPrefix="sidebar"
                    label="Details"
                    tabs={[{ id: 'area', label: selected_feature ? 'Area' : 'Overview' }, { id: 'insights', label: 'Insights' }]}
                    selected={tab}
                    onSelect={set_tab}
                />
            </div>

            <div
                role="tabpanel"
                id={panel_id('sidebar', tab)}
                aria-labelledby={tab_id('sidebar', tab)}
                className="p-4"
            >
                {tab === 'area' ? (
                    selected_feature && summary && static_data ? (
                        <AreaView
                            feature={selected_feature}
                            demography={static_data.demography}
                            deprivation={static_data.deprivation}
                            summary={summary}
                            onClose={() => select_area(null)}
                            focusOnOpen={selected_by_search}
                        />
                    ) : summary && static_data ? (
                        <Overview summary={summary} areas={static_data.areas} />
                    ) : (
                        <p className="m-0 text-sm text-ink-2">Loading…</p>
                    )
                ) : (
                    <AnalysisPanels
                        summary={summary}
                        crimeGroupCorrelation={static_data?.crime_group_correlation}
                        crimeDeprivationCorrelation={static_data?.crime_deprivation_correlation}
                    />
                )}
            </div>
        </>
    );

    return (
        <div className="flex h-dvh flex-col">
            {/* First thing keyboard users reach: jump past the header straight to the controls */}
            <a
                href="#controls"
                className="sr-only z-2000 border-2 border-ink bg-brand px-3 py-2 font-bold text-brand-ink focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
            >
                Skip to map controls
            </a>

            <AppHeader />

            {/* isolate keeps the map's own z-indexes contained so overlays can sit above them */}
            <div className="relative isolate flex min-h-0 flex-1">
                {is_desktop && (
                    <Sidebar docked snap={snap} onSnapChange={set_snap} available={map_height}>
                        {sidebar_content}
                    </Sidebar>
                )}

                <main
                    ref={map_area}
                    aria-label="Map"
                    className="relative min-w-0 flex-1"
                    // MapLibre's corner controls and the status pill sit above the bottom sheet
                    style={{ '--map-bottom-inset': `${sheet_px}px` } as CSSProperties}
                >
                    <CrimeMap
                        areas={static_data?.areas}
                        overlay={overlay}
                        selectedLsoa={selected_lsoa}
                        onSelect={lsoa => select_area(lsoa)}
                        onBoundariesLoaded={() => set_boundaries_loaded(true)}
                        clearSpace={clear_space}
                        initialClearSpace={initial_clear_space}
                    />

                    <MapLayers
                        overlayId={overlay_id}
                        onOverlayChange={set_overlay_id}
                        group={overlay_group}
                        onGroupChange={set_overlay_group}
                        overlay={overlay}
                    />
                    <MapStatus loadingLabel={loading_label} error={static_error ?? month_data.error} />
                </main>

                {!is_desktop && (
                    <Sidebar docked={false} snap={snap} onSnapChange={set_snap} available={map_height}>
                        {sidebar_content}
                    </Sidebar>
                )}
            </div>

            <p className="sr-only" aria-live="polite">{announcement}</p>
        </div>
    );
}
