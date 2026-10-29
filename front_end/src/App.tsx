import { useEffect, useMemo, useState } from 'react';

import MonthBar from './components/MonthBar/MonthBar';
import CrimeMap from './components/CrimeMap/CrimeMap';
import AreaPanel from './components/AreaDetails/AreaPanel';
import AnalysisPanels from './components/panels/AnalysisPanels';
import MapLayers from './components/MapLayers/MapLayers';
import MapStatus from './components/MapStatus/MapStatus';
import { useStaticData } from './hooks/useStaticData';
import { useMonthData } from './hooks/useMonthData';
import { get_country_crime } from './data/crime_stats';
import { LATEST_MONTH, format_month } from './data/months';
import { crime_overlay, deprivation_overlay, ethnicity_overlay, type OverlayId } from './lib/map_overlays';
import type { Group } from './data/demography_groups';
import type { MonthSummary } from './types';

export default function App() {
    const [selected_month, set_selected_month] = useState(LATEST_MONTH);

    // LSOA code of the area whose details are open; kept when the month changes
    const [selected_lsoa, set_selected_lsoa] = useState<string | null>(null);

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

    const loading_label = !static_data || !boundaries_loaded
        ? 'Loading map data…'
        : month_data.month !== selected_month
            ? `Loading ${format_month(selected_month, 'long')}…`
            : null;

    return (
        // month bar on top, map (with its overlays) fills the rest
        <div className="box-border flex h-dvh flex-col gap-3 p-3">
            <MonthBar selected={selected_month} onSelect={set_selected_month} />

            {/* isolate keeps the map's own z-indexes contained so overlays can sit above them */}
            <main className="relative isolate min-h-0 flex-1">
                <CrimeMap
                    areas={static_data?.areas}
                    overlay={overlay}
                    selectedLsoa={selected_lsoa}
                    onSelect={set_selected_lsoa}
                    onBoundariesLoaded={() => set_boundaries_loaded(true)}
                />

                {selected_feature && summary && static_data && (
                    <AreaPanel
                        feature={selected_feature}
                        demography={static_data.demography}
                        deprivation={static_data.deprivation}
                        summary={summary}
                        onClose={() => set_selected_lsoa(null)}
                    />
                )}

                <AnalysisPanels
                    summary={summary}
                    crimeGroupCorrelation={static_data?.crime_group_correlation}
                    crimeDeprivationCorrelation={static_data?.crime_deprivation_correlation}
                />

                {/* On phones the details open as a bottom sheet over the same corner */}
                <MapLayers
                    overlayId={overlay_id}
                    onOverlayChange={set_overlay_id}
                    group={overlay_group}
                    onGroupChange={set_overlay_group}
                    overlay={overlay}
                    className={selected_feature ? 'max-sm:hidden' : undefined}
                />
                <MapStatus loadingLabel={loading_label} error={static_error ?? month_data.error} />
            </main>
        </div>
    );
}
