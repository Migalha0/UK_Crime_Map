import { useEffect, useRef } from 'react';

import AreaDetails from './AreaDetails';
import { format_month } from '../../data/months';
import { cx } from '../../lib/cx';
import { CARD_SUBTITLE, CARD_TITLE, FOCUS_RING } from '../../lib/styles';
import type { DeprivationData } from '../../data/deprivation';
import type { Demography, LsoaArea, MonthSummary } from '../../types';

interface AreaViewProps {
    feature: LsoaArea;
    demography: Demography;
    deprivation: DeprivationData;
    summary: MonthSummary;
    onClose: () => void;
    /** Move keyboard focus to the area's name when it opens (when it was chosen from the search) */
    focusOnOpen: boolean;
}

/**
 * The selected area's details in the sidebar, with a way back to the national overview.
 */
export default function AreaView({ feature, demography, deprivation, summary, onClose, focusOnOpen }: AreaViewProps) {
    const heading = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        if (focusOnOpen) heading.current?.focus();
    }, [feature.lsoa, focusOnOpen]);

    return (
        <section aria-labelledby="area-heading">
            <button
                type="button"
                className={cx(
                    'mb-3 flex min-h-8 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-xs font-bold text-ink uppercase',
                    'underline-offset-4 hover:underline',
                    FOCUS_RING
                )}
                title="Back to England & Wales (Esc)"
                onClick={onClose}
            >
                <span aria-hidden>←</span> England &amp; Wales
            </button>

            {/* yellow title bar, as on the portfolio's project cards */}
            <h2
                id="area-heading"
                ref={heading}
                tabIndex={-1}
                className={cx(CARD_TITLE, 'border-2 border-ink bg-brand px-2 py-1 text-brand-ink outline-none')}
            >
                {feature.lsoaNM}
            </h2>
            <p className={cx(CARD_SUBTITLE, 'mb-3')}>
                LSOA {feature.lsoa} · {format_month(summary.month, 'long')}
            </p>

            <AreaDetails
                feature={feature}
                hasData={summary.coverage.has_data(feature.lsoa)}
                demography={demography}
                deprivation={deprivation.lsoa[feature.lsoa]}
                crimeData={summary.crime_data}
                countryCrime={summary.countryCrime}
            />
        </section>
    );
}
