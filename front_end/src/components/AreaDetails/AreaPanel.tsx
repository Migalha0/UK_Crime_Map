import AreaDetails from './AreaDetails';
import { format_month } from '../../data/months';
import { cx } from '../../lib/cx';
import { CARD_SUBTITLE, CARD_TITLE, FOCUS_RING, PANEL } from '../../lib/styles';
import type { DeprivationData } from '../../data/deprivation';
import type { Demography, LsoaArea, MonthSummary } from '../../types';

interface AreaPanelProps {
    feature: LsoaArea;
    demography: Demography;
    deprivation: DeprivationData;
    summary: MonthSummary;
    onClose: () => void;
}

/**
 * Details of the selected area, docked over the map's top-left corner.
 * On phones it becomes a bottom sheet so the selected area stays visible above it.
 * Its size matches the space LsoaLayer keeps clear when panning to a selection.
 */
export default function AreaPanel({ feature, demography, deprivation, summary, onClose }: AreaPanelProps) {
    return (
        <aside
            className={cx(
                PANEL,
                // above the map and its controls (contained by the map's isolate)
                'absolute z-1000 overflow-y-auto px-4 py-3.5',
                'top-2.5 left-2.5 max-h-[calc(100%-190px)] w-[340px]',
                'max-sm:top-auto max-sm:right-2 max-sm:bottom-2 max-sm:left-2 max-sm:max-h-[60%] max-sm:w-auto'
            )}
            aria-label={`Details for ${feature.lsoaNM}`}
        >
            <header className="mb-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    {/* yellow title bar, as on the portfolio's project cards */}
                    <h2 className={cx(CARD_TITLE, 'border-b-2 border-ink bg-brand px-1.5 py-0.5 text-brand-ink')}>{feature.lsoaNM}</h2>
                    <p className={CARD_SUBTITLE}>
                        LSOA {feature.lsoa} · {format_month(summary.month, 'long')}
                    </p>
                </div>

                <button
                    type="button"
                    className={cx(
                        'flex size-7 shrink-0 cursor-pointer items-center justify-center border-2 border-ink',
                        'bg-transparent text-lg leading-none text-ink hover:border-ink hover:bg-brand hover:text-brand-ink',
                        FOCUS_RING
                    )}
                    aria-label="Close area details"
                    title="Close (Esc)"
                    onClick={onClose}
                >
                    ×
                </button>
            </header>

            <AreaDetails
                feature={feature}
                hasData={summary.coverage.has_data(feature.lsoa)}
                demography={demography}
                deprivation={deprivation.lsoa[feature.lsoa]}
                crimeData={summary.crime_data}
                countryCrime={summary.countryCrime}
            />
        </aside>
    );
}
