import { useState } from 'react';

import AdjustedPanel from './AdjustedPanel';
import CorrelationPanel from './CorrelationPanel';
import CrimeGroupPanel from './CrimeGroupPanel';
import DeprivationPanel from './DeprivationPanel';
import DistancePanel from './DistancePanel';
import type { CrimeDeprivationCorrelation, CrimeGroupCorrelation, MonthSummary } from '../../types';

type PanelId = 'ethnicity' | 'crime-type' | 'deprivation' | 'adjusted' | 'distance';

interface AnalysisPanelsProps {
    summary: MonthSummary | null;
    crimeGroupCorrelation?: CrimeGroupCorrelation;
    crimeDeprivationCorrelation?: CrimeDeprivationCorrelation;
}

/**
 * Stack of analysis panels over the map's top-right corner.
 * Only one is open at a time so they never run past the bottom of the map;
 * on small screens all start closed so the map stays visible.
 */
export default function AnalysisPanels({ summary, crimeGroupCorrelation, crimeDeprivationCorrelation }: AnalysisPanelsProps) {
    const [open_panel, set_open_panel] = useState<PanelId | null>(() => window.innerWidth >= 720 ? 'ethnicity' : null);

    const toggle = (id: PanelId) => set_open_panel(current => current === id ? null : id);
    const panel = (id: PanelId) => ({ open: open_panel === id, onToggle: () => toggle(id) });

    return (
        <aside
            className={
                // above the map and its controls; map drags pass through the gaps between panels
                'pointer-events-none absolute top-2.5 right-2.5 z-1000 flex max-h-[calc(100%-20px)] ' +
                'w-[min(320px,calc(100%-80px))] flex-col gap-2 *:pointer-events-auto'
            }
            aria-label="Analysis"
        >
            {summary && <CorrelationPanel month={summary.month} result={summary.correlations} {...panel('ethnicity')} />}

            {crimeGroupCorrelation && <CrimeGroupPanel result={crimeGroupCorrelation} {...panel('crime-type')} />}

            {summary && crimeDeprivationCorrelation && (
                <DeprivationPanel
                    month={summary.month}
                    result={summary.correlations.deprivation}
                    byCrimeType={crimeDeprivationCorrelation}
                    {...panel('deprivation')}
                />
            )}

            {summary && <AdjustedPanel month={summary.month} result={summary.correlations} {...panel('adjusted')} />}

            <DistancePanel {...panel('distance')} />
        </aside>
    );
}
