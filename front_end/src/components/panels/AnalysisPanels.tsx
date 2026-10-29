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
 * The analysis sections in the sidebar's Insights tab, each one opened and closed
 * on its own. The first starts open.
 */
export default function AnalysisPanels({ summary, crimeGroupCorrelation, crimeDeprivationCorrelation }: AnalysisPanelsProps) {
    const [open_panels, set_open_panels] = useState<Set<PanelId>>(() => new Set(['ethnicity']));

    const panel = (id: PanelId) => ({
        open: open_panels.has(id),
        onToggle: () => set_open_panels(current => {
            const next = new Set(current);
            if (!next.delete(id)) next.add(id);
            return next;
        }),
    });

    return (
        <div className="flex flex-col gap-3">
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
        </div>
    );
}
